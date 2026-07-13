// Shared generation-delivery helpers (PRD §12.3 step 5) — used by every provider webhook and
// the cron reconciler. Outputs are copied into R2 BEFORE the generation is marked delivered
// (FR-D1). Failed/nsfw release the hold — users are never charged for undelivered work (§10.3).
//
// Security: never trust webhook body URLs alone. Callers should use confirmFromProvider()
// which re-polls the provider with our API key, then filters hosts before fetch.
import { ulid, nowMs } from './ids.js'
import * as hf from '../providers/higgsfield.js'
import * as fal from '../providers/fal.js'

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' }

// Hosts we will fetch into R2. Keep broad enough for all current providers so legit
// completions are never dropped (UX). Deny everything else (SSRF / forged webhooks).
const MEDIA_HOST_SUFFIXES = [
  'fal.media',
  'fal.ai',
  'higgsfield.ai',
  'cloudfront.net',
  'blob.core.windows.net',
  'r2.dev',
  'amazonaws.com',
  'googleusercontent.com',
  'storage.googleapis.com',
]

export function isAllowedMediaUrl(raw) {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    // Block obvious SSRF targets
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false // raw IPv4
    if (host.includes(':')) return false // IPv6
    return MEDIA_HOST_SUFFIXES.some((s) => host === s || host.endsWith('.' + s))
  } catch {
    return false
  }
}

// Pull output URLs out of a provider result body, tolerating the field-name variants seen in
// the wild (HF nests under payload.payload; fal uses images[] / video{}).
export function extractOutputUrls(body) {
  if (!body || typeof body !== 'object') return []
  const list = body.images || body.videos || (body.video ? [body.video] : null) || body.results || body.outputs || body.output || []
  return list.map((o) => o?.url || o).filter((u) => typeof u === 'string')
}

export function filterAllowedUrls(urls) {
  return (urls || []).filter(isAllowedMediaUrl)
}

export async function copyOutputsAndSettle(env, gen, urls) {
  const allowed = filterAllowedUrls(urls)
  const out = []
  for (const url of allowed) {
    let r
    try {
      r = await fetch(url, { redirect: 'follow' })
    } catch {
      continue
    }
    if (!r.ok) continue
    const ct = (r.headers.get('content-type') || 'application/octet-stream').split(';')[0]
    // Only store media — never HTML/JSON error pages
    if (ct && !ct.startsWith('image/') && !ct.startsWith('video/') && ct !== 'application/octet-stream') continue
    const assetId = ulid()
    const key = `users/${gen.user_id}/${gen.kind}/${assetId}.${EXT[ct] || 'bin'}`
    await env.ASSETS.put(key, r.body, { httpMetadata: { contentType: ct } })
    await env.DB.prepare(
      'INSERT INTO assets (id, user_id, r2_key, kind, content_type, source_generation_id, created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(assetId, gen.user_id, key, gen.kind, ct, gen.id, nowMs()).run()
    out.push({ id: assetId, r2_key: key, content_type: ct })
  }
  // Never settle a completed generation that stored zero assets — that charges the user for
  // nothing. Webhook callers turn this throw into a retryable 500.
  if (!out.length) throw new Error(`completed but 0 assets stored (parsed ${urls?.length || 0} urls, allowed ${allowed.length})`)
  await env.DB.prepare('UPDATE generations SET status=?, output_assets_json=?, delivered_at=? WHERE id=?')
    .bind('delivered', JSON.stringify(out), nowMs(), gen.id).run()
  if (gen.hold_id) {
    const acct = env.CREDIT_ACCOUNT.get(env.CREDIT_ACCOUNT.idFromName(gen.user_id))
    await acct.settle(gen.user_id, gen.hold_id, { type: 'generation', id: gen.id })
  }
  return out
}

export async function releaseAndFail(env, gen, statusLabel, errText = statusLabel) {
  // Idempotent if already terminal
  if (gen.status === 'delivered' || gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'cancelled') {
    return
  }
  await env.DB.prepare('UPDATE generations SET status=?, error=? WHERE id=?')
    .bind(statusLabel, String(errText).slice(0, 200), gen.id).run()
  if (gen.hold_id) {
    const acct = env.CREDIT_ACCOUNT.get(env.CREDIT_ACCOUNT.idFromName(gen.user_id))
    await acct.release(gen.user_id, gen.hold_id, statusLabel)
  }
}

/**
 * Authoritative delivery path: re-query the provider with our API credentials, then settle
 * or release. Webhook body is a wake-up signal only — never the source of truth for URLs.
 *
 * Returns: { action: 'delivered'|'released'|'pending'|'unmatched', detail? }
 * Does not change UX for the browser — generate submit still returns immediately.
 */
export async function confirmFromProvider(env, gen) {
  if (!gen?.provider_request_id) return { action: 'pending', detail: 'no_request_id' }
  // Already done — idempotent no-op for webhook retries
  if (gen.status === 'delivered') return { action: 'delivered', detail: 'already' }
  if (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'cancelled') {
    return { action: 'released', detail: 'already_terminal' }
  }

  if (gen.provider === 'higgsfield') {
    const st = await hf.status(env, gen.provider_request_id)
    const status = st?.status
    if (status === 'completed') {
      const urls = extractOutputUrls(st.payload).length
        ? extractOutputUrls(st.payload)
        : extractOutputUrls(st)
      await copyOutputsAndSettle(env, gen, urls)
      return { action: 'delivered' }
    }
    if (status === 'failed' || status === 'nsfw' || status === 'cancelled') {
      await releaseAndFail(env, gen, status === 'nsfw' ? 'nsfw' : 'failed', status)
      return { action: 'released' }
    }
    return { action: 'pending', detail: status || 'unknown' }
  }

  if (gen.provider === 'fal') {
    let params = {}
    try { params = JSON.parse(gen.params_json || '{}') } catch { /* empty */ }
    const req = fal.buildRequest(gen.model, params)
    if (!req) {
      // Can't re-poll without a path — fail safe: leave pending for cron
      return { action: 'pending', detail: 'unknown_model' }
    }
    const st = await fal.status(env, req.path, gen.provider_request_id)
    const status = st?.status
    if (status === 'COMPLETED') {
      const out = await fal.result(env, req.path, gen.provider_request_id)
      await copyOutputsAndSettle(env, gen, extractOutputUrls(out))
      return { action: 'delivered' }
    }
    if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
      await releaseAndFail(env, gen, 'failed', status)
      return { action: 'released' }
    }
    // IN_QUEUE / IN_PROGRESS
    return { action: 'pending', detail: status || 'unknown' }
  }

  return { action: 'pending', detail: 'unknown_provider' }
}
