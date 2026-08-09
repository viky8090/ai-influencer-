// Profile & settings — GET/PATCH /api/me (PRD §9.2, §9.3, §14).
import { Hono } from 'hono'

const me = new Hono()

me.get('/', (c) => {
  const u = c.get('user')
  return c.json({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    handle: u.handle,
    bio: u.bio,
    avatar_r2_key: u.avatar_r2_key,
    defaults: {
      model: u.default_model,
      aspect: u.default_aspect,
      resolution: u.default_resolution,
    },
  })
})

// Update editable profile/settings fields (only the whitelisted keys; tenant-scoped).
me.patch('/', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const allowed = ['display_name', 'handle', 'bio', 'default_model', 'default_aspect', 'default_resolution']
  const fields = {}
  for (const k of allowed) if (k in body) fields[k] = body[k]
  if (Object.keys(fields).length === 0) return c.json({ error: 'no_fields' }, 400)

  // Handle: normalise + validate format + enforce uniqueness.
  if ('handle' in fields && fields.handle) {
    const h = String(fields.handle).trim().toLowerCase().replace(/^@/, '')
    if (!/^[a-z0-9_]{3,30}$/.test(h)) return c.json({ error: 'invalid_handle' }, 400)
    const taken = await c.env.DB.prepare('SELECT id FROM users WHERE handle = ? AND id != ?').bind(h, u.id).first()
    if (taken) return c.json({ error: 'handle_taken' }, 409)
    fields.handle = h
  }

  const cols = Object.keys(fields)            // whitelisted above → safe to interpolate
  const sets = cols.map((k) => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`)
    .bind(...cols.map((k) => fields[k]), Date.now(), u.id).run()

  const r = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(u.id).first()
  return c.json({
    id: r.id, email: r.email, display_name: r.display_name, handle: r.handle, bio: r.bio,
    defaults: { model: r.default_model, aspect: r.default_aspect, resolution: r.default_resolution },
  })
})

export default me
