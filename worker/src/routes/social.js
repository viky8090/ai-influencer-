// Social publishing — /api/social (PRD N13, §12.8). Postiz-backed channels, posts, calendar.
// ONE Postiz org holds all channels; D1 maps integration ids → users and every route
// enforces ownership. Paid plans only (Starter+): free users get 403.
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'
import {
  isPostizConfigured, PostizError,
  listIntegrations, getConnectUrl, deleteIntegration, integrationSettings,
  uploadFromUrl, createPost, listPosts, changePostStatus, deletePost,
} from '../lib/postiz.js'
import { canPublish, getActivePlan } from '../lib/plans.js'

const social = new Hono()

// Platforms connectable through the public API's OAuth-URL endpoint (Bluesky/Mastodon
// need credential forms Postiz only offers in its own UI — not exposed in v1).
// Phase-D platforms activate here once their env vars land in Postiz.
const CONNECTABLE = ['x', 'linkedin', 'linkedin-page', 'pinterest', 'facebook', 'instagram', 'threads', 'youtube', 'tiktok', 'reddit']

// Minimal required settings per platform so the composer can stay simple (§ composer).
const DEFAULT_SETTINGS = {
  x: { who_can_reply_post: 'everyone' },
  instagram: { post_type: 'post' },
  'instagram-standalone': { post_type: 'post' },
}

const PENDING_TTL_MS = 15 * 60 * 1000

// ── Gate: Postiz configured + active paid plan (Starter+) ───────────────
social.use('*', async (c, next) => {
  if (!isPostizConfigured(c.env)) return c.json({ error: 'publishing_not_configured' }, 503)
  const u = c.get('user')
  const plan = await getActivePlan(c.env, u.id)
  if (!canPublish(plan)) return c.json({ error: 'plan_required' }, 403)
  c.set('plan', plan)
  await next()
})

const ownedChannel = (db, userId, id) =>
  db.prepare('SELECT * FROM social_channels WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .bind(id, userId).first()

// ── Channels ────────────────────────────────────────────────────────────

// List the user's connected channels, freshening name/picture/status from Postiz
// best-effort (stale D1 copy is served if Postiz is unreachable).
social.get('/channels', async (c) => {
  const u = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM social_channels WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at'
  ).bind(u.id).all()

  let live = null
  try { live = await listIntegrations(c.env) } catch (e) { console.error('postiz list failed:', String(e?.message || e)) }
  const byId = new Map((live || []).map((i) => [i.id, i]))

  const channels = results.map((row) => {
    const l = byId.get(row.postiz_integration_id)
    return {
      id: row.id,
      platform: row.platform,
      name: l?.name ?? row.name,
      picture: l?.picture ?? row.picture,
      status: live ? (l ? (l.disabled ? 'disabled' : 'active') : 'missing') : row.status,
    }
  })
  return c.json({ channels, connectable: CONNECTABLE })
})

// Start connecting a channel: snapshot org integrations, hand back the OAuth URL.
social.post('/channels/connect', async (c) => {
  const u = c.get('user')
  const { platform } = await c.req.json().catch(() => ({}))
  if (!CONNECTABLE.includes(platform)) return c.json({ error: 'unsupported_platform' }, 400)

  try {
    const existing = await listIntegrations(c.env)
    const { url } = await getConnectUrl(c.env, platform)
    if (!url) throw new PostizError(500, 'no url returned')

    const id = ulid()
    await c.env.DB.prepare(
      'INSERT INTO social_pending_connects (id, user_id, platform, known_ids_json, created_at) VALUES (?,?,?,?,?)'
    ).bind(id, u.id, platform, JSON.stringify(existing.map((i) => i.id)), nowMs()).run()
    return c.json({ url, pending_id: id })
  } catch (e) {
    console.error('postiz connect failed:', String(e?.message || e))
    const code = e instanceof PostizError && e.status === 400 ? 'platform_not_enabled' : 'connect_failed'
    return c.json({ error: code }, 502)
  }
})

// Poll after the OAuth popup: diff current integrations against the snapshot and
// bind the new one to this user. { channel } when bound, { pending: true } while waiting.
social.post('/channels/claim', async (c) => {
  const u = c.get('user')
  const { pending_id } = await c.req.json().catch(() => ({}))
  const pending = await c.env.DB.prepare(
    'SELECT * FROM social_pending_connects WHERE id = ? AND user_id = ?'
  ).bind(pending_id, u.id).first()
  if (!pending) return c.json({ error: 'not_found' }, 404)
  if (nowMs() - pending.created_at > PENDING_TTL_MS) {
    await c.env.DB.prepare('DELETE FROM social_pending_connects WHERE id = ?').bind(pending_id).run()
    return c.json({ error: 'expired' }, 410)
  }

  let live
  try { live = await listIntegrations(c.env) } catch { return c.json({ pending: true }) }
  const known = new Set(JSON.parse(pending.known_ids_json))
  const fresh = live.filter((i) => i.identifier === pending.platform && !known.has(i.id))
  if (!fresh.length) return c.json({ pending: true })

  // Exclude integrations any user already claimed (INSERT is the arbiter under races —
  // postiz_integration_id is UNIQUE, so a lost race just moves on to the next candidate).
  for (const cand of fresh) {
    const taken = await c.env.DB.prepare(
      'SELECT id FROM social_channels WHERE postiz_integration_id = ?'
    ).bind(cand.id).first()
    if (taken) continue
    const id = ulid()
    try {
      await c.env.DB.prepare(
        `INSERT INTO social_channels (id, user_id, postiz_integration_id, platform, name, picture, status, created_at)
         VALUES (?,?,?,?,?,?, 'active', ?)`
      ).bind(id, u.id, cand.id, pending.platform, cand.name || null, cand.picture || null, nowMs()).run()
    } catch { continue } // UNIQUE collision — another claim won this candidate
    await c.env.DB.prepare('DELETE FROM social_pending_connects WHERE id = ?').bind(pending_id).run()
    return c.json({ channel: { id, platform: pending.platform, name: cand.name, picture: cand.picture, status: 'active' } })
  }
  return c.json({ pending: true })
})

// Disconnect. Postiz deletes the channel's scheduled posts too — UI must confirm first.
social.delete('/channels/:id', async (c) => {
  const u = c.get('user')
  const row = await ownedChannel(c.env.DB, u.id, c.req.param('id'))
  if (!row) return c.json({ error: 'not_found' }, 404)

  try { await deleteIntegration(c.env, row.postiz_integration_id) }
  catch (e) {
    if (!(e instanceof PostizError && e.status === 404)) {
      console.error('postiz delete integration failed:', String(e?.message || e))
      return c.json({ error: 'disconnect_failed' }, 502)
    }
  }
  const now = nowMs()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE social_channels SET deleted_at = ? WHERE id = ?').bind(now, row.id),
    // Scheduled posts on this channel died with it in Postiz; reflect that here.
    c.env.DB.prepare(
      `UPDATE social_posts SET state = 'deleted', updated_at = ?
       WHERE user_id = ? AND state IN ('draft','scheduled') AND instr(integration_ids_json, ?) > 0`
    ).bind(now, u.id, row.postiz_integration_id),
  ])
  return c.json({ ok: true })
})

// Settings schema / posting rules for the composer (e.g. Pinterest board list via tools).
social.get('/channels/:id/settings', async (c) => {
  const u = c.get('user')
  const row = await ownedChannel(c.env.DB, u.id, c.req.param('id'))
  if (!row) return c.json({ error: 'not_found' }, 404)
  try {
    return c.json(await integrationSettings(c.env, row.postiz_integration_id))
  } catch (e) {
    console.error('postiz settings failed:', String(e?.message || e))
    return c.json({ error: 'settings_unavailable' }, 502)
  }
})

// ── Posts ───────────────────────────────────────────────────────────────

// Best-effort image|video classification for a Vymotion public asset URL, from the asset's
// stored content-type. Drives thumbnail rendering in the composer/calendar (the URL itself
// carries no extension). Never throws — falls back to 'image'.
async function mediaTypeForUrl(env, url) {
  const m = url.match(/\/public\/(?:assets|refs)\/([^/?#]+)/)
  if (!m) return 'image'
  const row = await env.DB.prepare('SELECT content_type FROM assets WHERE id = ?').bind(m[1]).first().catch(() => null)
  return row?.content_type?.startsWith('video/') ? 'video' : 'image'
}

// Resolve a Vymotion public asset URL to a Postiz MediaFile, through the D1 cache.
async function resolveMedia(env, urls) {
  const out = []
  for (const url of urls) {
    // Only media this Worker serves — Postiz fetches the URL server-side (SSRF guard).
    if (!url.startsWith(`${env.API_URL}/public/`)) throw new PostizError(400, `media url not allowed: ${url}`)
    const type = await mediaTypeForUrl(env, url)
    const cached = await env.DB.prepare('SELECT * FROM postiz_media WHERE url = ?').bind(url).first()
    if (cached) { out.push({ id: cached.postiz_media_id, path: cached.postiz_path, url, type }); continue }
    const file = await uploadFromUrl(env, url)
    if (!file?.id || !file?.path) throw new PostizError(500, 'upload returned no file')
    await env.DB.prepare(
      'INSERT OR REPLACE INTO postiz_media (url, postiz_media_id, postiz_path, created_at) VALUES (?,?,?,?)'
    ).bind(url, file.id, file.path, nowMs()).run()
    out.push({ id: file.id, path: file.path, url, type })
  }
  return out
}

// Create/schedule/draft a post across one or more owned channels.
// { type: now|schedule|draft, date?, content, media: [url], channels: [{channel_id, settings?}], influencer_id? }
social.post('/posts', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const type = ['now', 'schedule', 'draft'].includes(body.type) ? body.type : null
  const content = String(body.content ?? '').trim()
  const mediaUrls = Array.isArray(body.media) ? body.media.filter((m) => typeof m === 'string') : []
  const reqChannels = Array.isArray(body.channels) ? body.channels : []
  if (!type || !reqChannels.length) return c.json({ error: 'bad_request' }, 400)
  if (!content && !mediaUrls.length) return c.json({ error: 'empty_post' }, 400)

  const date = type === 'schedule' ? new Date(body.date ?? NaN) : new Date()
  if (Number.isNaN(date.getTime())) return c.json({ error: 'bad_date' }, 400)
  if (type === 'schedule' && date.getTime() < Date.now() - 60_000) return c.json({ error: 'date_in_past' }, 400)

  const rows = []
  for (const ch of reqChannels) {
    const row = await ownedChannel(c.env.DB, u.id, String(ch.channel_id || ''))
    if (!row) return c.json({ error: 'unknown_channel' }, 400)
    rows.push({ row, settings: ch.settings && typeof ch.settings === 'object' ? ch.settings : {} })
  }

  try {
    const media = await resolveMedia(c.env, mediaUrls)
    const payload = {
      type,
      date: date.toISOString(),
      shortLink: false,
      tags: [],
      posts: rows.map(({ row, settings }) => ({
        integration: { id: row.postiz_integration_id },
        value: [{ content, image: media.map((m) => ({ id: m.id, path: m.path })) }],
        settings: { __type: row.platform, ...(DEFAULT_SETTINGS[row.platform] || {}), ...settings },
      })),
    }
    const created = await createPost(c.env, payload)

    const id = ulid()
    const now = nowMs()
    const record = {
      id,
      user_id: u.id,
      postiz_post_id: Array.isArray(created) ? created[0]?.postId ?? null : null,
      response_json: JSON.stringify(created ?? null),
      influencer_id: body.influencer_id ?? null,
      integration_ids_json: JSON.stringify(rows.map(({ row }) => row.postiz_integration_id)),
      content,
      media_json: JSON.stringify(media),
      settings_json: JSON.stringify(Object.fromEntries(rows.map(({ row, settings }) => [row.id, settings]))),
      scheduled_at: date.getTime(),
      state: type === 'draft' ? 'draft' : 'scheduled',
      created_at: now,
      updated_at: now,
    }
    await c.env.DB.prepare(
      `INSERT INTO social_posts (id, user_id, postiz_post_id, response_json, influencer_id, integration_ids_json,
        content, media_json, settings_json, scheduled_at, state, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(record.id, record.user_id, record.postiz_post_id, record.response_json, record.influencer_id,
      record.integration_ids_json, record.content, record.media_json, record.settings_json,
      record.scheduled_at, record.state, record.created_at, record.updated_at).run()

    return c.json({ post: shapePost(record) })
  } catch (e) {
    console.error('social post create failed:', String(e?.message || e))
    return c.json({ error: 'post_failed' }, 502) // friendly copy only (§12.7)
  }
})

// Calendar feed: D1 rows in range, refreshed against live Postiz state best-effort.
social.get('/posts', async (c) => {
  const u = c.get('user')
  const from = Number(c.req.query('from')) || Date.now() - 30 * 86400_000
  const to = Number(c.req.query('to')) || Date.now() + 60 * 86400_000
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM social_posts WHERE user_id = ? AND state != 'deleted'
       AND scheduled_at BETWEEN ? AND ? ORDER BY scheduled_at`
  ).bind(u.id, from, to).all()

  try { await refreshStates(c.env, results) } catch (e) { console.error('social sync failed:', String(e?.message || e)) }
  return c.json({ posts: results.map(shapePost) })
})

// draft ↔ schedule.
social.patch('/posts/:id', async (c) => {
  const u = c.get('user')
  const { status } = await c.req.json().catch(() => ({}))
  if (!['draft', 'schedule'].includes(status)) return c.json({ error: 'bad_request' }, 400)
  const row = await c.env.DB.prepare(
    "SELECT * FROM social_posts WHERE id = ? AND user_id = ? AND state IN ('draft','scheduled')"
  ).bind(c.req.param('id'), u.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)

  try {
    for (const pid of postIds(row)) await changePostStatus(c.env, pid, status)
  } catch (e) {
    console.error('social status change failed:', String(e?.message || e))
    return c.json({ error: 'update_failed' }, 502)
  }
  const state = status === 'draft' ? 'draft' : 'scheduled'
  await c.env.DB.prepare('UPDATE social_posts SET state = ?, updated_at = ? WHERE id = ?')
    .bind(state, nowMs(), row.id).run()
  return c.json({ ok: true, state })
})

social.delete('/posts/:id', async (c) => {
  const u = c.get('user')
  const row = await c.env.DB.prepare(
    'SELECT * FROM social_posts WHERE id = ? AND user_id = ?'
  ).bind(c.req.param('id'), u.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)

  if (row.postiz_post_id) {
    try { await deletePost(c.env, row.postiz_post_id) } // deletes the whole group
    catch (e) {
      if (!(e instanceof PostizError && e.status === 404)) { // 404 = already gone
        console.error('social post delete failed:', String(e?.message || e))
        return c.json({ error: 'delete_failed' }, 502)
      }
    }
  }
  await c.env.DB.prepare("UPDATE social_posts SET state = 'deleted', updated_at = ? WHERE id = ?")
    .bind(nowMs(), row.id).run()
  return c.json({ ok: true })
})

// ── State sync (also called from the cron in index.js) ─────────────────

function postIds(row) {
  try {
    const resp = JSON.parse(row.response_json || 'null')
    if (Array.isArray(resp)) return resp.map((p) => p.postId).filter(Boolean)
  } catch { /* fall through */ }
  return row.postiz_post_id ? [row.postiz_post_id] : []
}

function shapePost(row) {
  return {
    id: row.id,
    content: row.content,
    media: JSON.parse(row.media_json || '[]'),
    integration_ids: JSON.parse(row.integration_ids_json || '[]'),
    influencer_id: row.influencer_id,
    scheduled_at: row.scheduled_at,
    state: row.state,
    release_urls: JSON.parse(row.release_urls_json || '[]'),
    error: row.error,
    created_at: row.created_at,
  }
}

// Pull live states from Postiz for the given D1 rows and write back changes.
// QUEUE|DRAFT keep our state; any ERROR → error; all PUBLISHED → published.
export async function refreshStates(env, rows) {
  const pending = rows.filter((r) => r.state === 'scheduled' && r.scheduled_at <= Date.now() + 60_000)
  if (!pending.length) return
  const min = Math.min(...pending.map((r) => r.scheduled_at)) - 86400_000
  const max = Math.max(...pending.map((r) => r.scheduled_at)) + 86400_000
  const live = await listPosts(env, new Date(min).toISOString(), new Date(max).toISOString())
  const byId = new Map((live?.posts || []).map((p) => [p.id, p]))

  for (const row of pending) {
    const ids = postIds(row)
    const found = ids.map((id) => byId.get(id)).filter(Boolean)
    let state = row.state
    let releaseUrls = null
    let error = null
    if (found.length) {
      if (found.some((p) => p.state === 'ERROR')) { state = 'error'; error = 'publish_failed' }
      else if (found.every((p) => p.state === 'PUBLISHED')) {
        state = 'published'
        releaseUrls = found.map((p) => p.releaseURL).filter(Boolean)
      }
    } else if (row.scheduled_at < Date.now() - 3600_000) {
      state = 'error'; error = 'missing_in_postiz' // vanished (e.g. deleted in Postiz directly)
    }
    if (state !== row.state) {
      await env.DB.prepare(
        'UPDATE social_posts SET state = ?, release_urls_json = ?, error = ?, updated_at = ? WHERE id = ?'
      ).bind(state, releaseUrls ? JSON.stringify(releaseUrls) : row.release_urls_json, error, nowMs(), row.id).run()
      row.state = state
      row.release_urls_json = releaseUrls ? JSON.stringify(releaseUrls) : row.release_urls_json
      row.error = error
    }
  }
}

// Cron entry: sync overdue scheduled posts so the calendar flips to published/error
// even when nobody has the app open. (The Public API has no outbound webhooks.)
export async function syncSocialPosts(env) {
  if (!isPostizConfigured(env)) return
  const { results } = await env.DB.prepare(
    `SELECT * FROM social_posts WHERE state = 'scheduled' AND scheduled_at <= ? LIMIT 50`
  ).bind(Date.now()).all()
  if (results.length) await refreshStates(env, results)
}

export default social
