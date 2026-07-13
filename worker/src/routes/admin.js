// Ops console API — /api/admin (PRD §19, N10). Role-gated, fully audited.
// Look up users, view ledgers, issue goodwill credits (audited `adjust`), inspect a
// generation + its provider request_id, replay/settle stuck jobs, suspend accounts.
import { Hono } from 'hono'

const admin = new Hono()

// Gate: only users with an admin role may touch /api/admin/*.  TODO(phase-5): real RBAC.
admin.use('*', async (c, next) => {
  const u = c.get('user')
  if (!u || u.role !== 'admin') return c.json({ error: 'forbidden' }, 403)
  await next()
})

admin.get('/users/:id', (c) => c.json({ error: 'not_implemented' }, 501))
admin.get('/users/:id/ledger', (c) => c.json({ error: 'not_implemented' }, 501))
admin.post('/users/:id/adjust', (c) => c.json({ error: 'not_implemented' }, 501))

export default admin
