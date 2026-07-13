// Asset delivery — GET /api/assets/:id (PRD §13.2). Streams the private R2 object to the
// owner. R2 objects are never public. TODO(phase-3, frontend cutover): issue short-lived
// signed URLs (token in query) so <img>/<video> tags — which can't send the Clerk header —
// can load assets directly; header auth here covers programmatic fetches.
import { Hono } from 'hono'

const assets = new Hono()

assets.get('/:id', async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare('SELECT * FROM assets WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)

  const obj = await c.env.ASSETS.get(row.r2_key)
  if (!obj) return c.json({ error: 'gone' }, 404)

  return new Response(obj.body, {
    headers: {
      'Content-Type': row.content_type || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

export default assets
