// Asset delivery — GET /api/assets/:id (PRD §13.2). Streams the private R2 object to the
// owner. R2 objects are never public. TODO(phase-3, frontend cutover): issue short-lived
// signed URLs (token in query) so <img>/<video> tags — which can't send the Clerk header —
// can load assets directly; header auth here covers programmatic fetches.
import { Hono } from 'hono'
import { serveR2Media } from '../lib/serveMedia.js'

const assets = new Hono()

assets.get('/:id', async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)

  // edgeCache MUST stay off here: this response is per-user (auth header), the edge cache is
  // shared by URL — caching it would serve one user's private asset to another.
  return serveR2Media(c, row.r2_key, row.content_type || 'application/octet-stream', {
    cacheControl: 'private, max-age=3600',
    edgeCache: false,
  })
})

export default assets
