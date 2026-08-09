// Reference-image uploads — POST /api/uploads (Phase 3 cutover).
// The app holds reference images as local data-URLs, but Higgsfield needs fetchable URLs.
// Flow: authenticated upload → R2 (`uploads/{user}/{ulid}.{ext}`) + assets row (kind='ref')
// → returns a public-but-unguessable URL served by GET /public/refs/:id (mounted outside the
// auth middleware; only kind='ref' assets are ever exposed there — generations stay private).
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'
import { serveR2Media } from '../lib/serveMedia.js'

const uploads = new Hono()

const MAX_BYTES = 12 * 1024 * 1024 // 12 MB cap per reference image
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

// Remote re-host allowlist (SSRF guard): only known media hosts can be fetched server-side.
const REMOTE_ALLOW = [/\.cloudfront\.net$/, /(^|\.)higgsfield\.ai$/]

uploads.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => null)

  // Variant B: { url } — re-host a remote CDN image into R2 (lets the browser then fetch it
  // same-origin-ish for canvas downscaling when the CDN blocks CORS).
  if (body?.url && !body?.dataUrl) {
    let u
    try { u = new URL(body.url) } catch { return c.json({ error: 'bad_url' }, 400) }
    if (u.protocol !== 'https:' || !REMOTE_ALLOW.some((re) => re.test(u.hostname))) {
      return c.json({ error: 'host_not_allowed' }, 403)
    }
    const r = await fetch(u).catch(() => null)
    if (!r || !r.ok) return c.json({ error: 'fetch_failed' }, 502)
    // Redirect guard: fetch follows redirects, so an allowlisted host could bounce us
    // anywhere. Re-validate the FINAL url against the same allowlist.
    try {
      const fin = new URL(r.url || u)
      if (fin.protocol !== 'https:' || !REMOTE_ALLOW.some((re) => re.test(fin.hostname))) {
        return c.json({ error: 'host_not_allowed' }, 403)
      }
    } catch { return c.json({ error: 'bad_url' }, 400) }
    const contentType = (r.headers.get('content-type') || '').split(';')[0]
    if (!EXT[contentType]) return c.json({ error: 'unsupported_type', contentType }, 400)
    const buf = new Uint8Array(await r.arrayBuffer())
    if (buf.length > 25 * 1024 * 1024) return c.json({ error: 'too_large' }, 413)
    const id = ulid()
    const key = `uploads/${user.id}/${id}.${EXT[contentType]}`
    await c.env.ASSETS.put(key, buf, { httpMetadata: { contentType } })
    await c.env.DB.prepare(
      'INSERT INTO assets (id, user_id, r2_key, kind, content_type, bytes, created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(id, user.id, key, 'ref', contentType, buf.length, nowMs()).run()
    return c.json({ id, url: `${c.env.API_URL}/public/refs/${id}` })
  }

  const dataUrl = body?.dataUrl
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return c.json({ error: 'bad_request', detail: 'expected { dataUrl } or { url }' }, 400)
  }

  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/s)
  if (!m) return c.json({ error: 'bad_data_url' }, 400)
  const contentType = m[1]
  if (!EXT[contentType]) return c.json({ error: 'unsupported_type', contentType }, 400)

  let bytes
  try {
    const bin = atob(m[2])
    if (bin.length > MAX_BYTES) return c.json({ error: 'too_large', maxBytes: MAX_BYTES }, 413)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    return c.json({ error: 'bad_base64' }, 400)
  }

  const id = ulid()
  const key = `uploads/${user.id}/${id}.${EXT[contentType]}`
  await c.env.ASSETS.put(key, bytes, { httpMetadata: { contentType } })
  await c.env.DB.prepare(
    'INSERT INTO assets (id, user_id, r2_key, kind, content_type, bytes, created_at) VALUES (?,?,?,?,?,?,?)'
  ).bind(id, user.id, key, 'ref', contentType, bytes.length, nowMs()).run()

  return c.json({ id, url: `${c.env.API_URL}/public/refs/${id}` })
})

export default uploads

// Public (unauthenticated) ref serving — mounted at /public/refs in index.js, BEFORE auth.
// Only assets explicitly uploaded as references (kind='ref') are reachable; ids are ULIDs.
export const publicRefs = new Hono()

publicRefs.get('/:id', async (c) => {
  const row = await c.env.DB.prepare("SELECT r2_key, content_type FROM assets WHERE id = ? AND kind = 'ref'")
    .bind(c.req.param('id')).first()
  if (!row) return c.json({ error: 'not_found' }, 404)
  return serveR2Media(c, row.r2_key, row.content_type || 'image/png', {
    cacheControl: 'public, max-age=86400',
    edgeCache: true,
    cors: true, // lets the SPA canvas-process refs without taint
  })
})

// Public (unlisted) generated-asset serving — GET /public/assets/:id.
// ULIDs remain the access key so <img>/<video> keep working without auth headers (UX).
// Hardening without breaking loads: only media content-types; long cache; no sniffing.
// TODO(phase-5): short-lived signed URLs for private-by-default assets + explicit share.
export const publicAssets = new Hono()

publicAssets.get('/:id', async (c) => {
  const id = c.req.param('id')
  // ULIDs are 26 Crockford base32 chars — reject garbage fast
  if (!id || id.length < 20 || id.length > 40 || !/^[0-9A-HJKMNP-TV-Z]+$/i.test(id)) {
    return c.json({ error: 'not_found' }, 404)
  }
  const row = await c.env.DB.prepare('SELECT r2_key, content_type FROM assets WHERE id = ?')
    .bind(id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)
  const ct = row.content_type || 'application/octet-stream'
  if (!ct.startsWith('image/') && !ct.startsWith('video/')) {
    return c.json({ error: 'not_found' }, 404)
  }
  return serveR2Media(c, row.r2_key, ct, {
    cacheControl: 'public, max-age=31536000, immutable',
    edgeCache: true,
    cors: true, // canvas reuse for wardrobe/ref pipeline
  })
})
