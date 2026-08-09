// Generation status, library & cancel — /api/generations (PRD §14).
import { Hono } from 'hono'

const generations = new Hono()

function toClient(row) {
  return {
    id: row.id,
    influencer_id: row.influencer_id,
    kind: row.kind,
    model: row.model,
    status: row.status,
    cost_vc: row.cost_vc,
    error: row.error,
    output_assets: row.output_assets_json ? JSON.parse(row.output_assets_json) : [],
    created_at: row.created_at,
    delivered_at: row.delivered_at,
  }
}

// Library / history, optionally filtered by influencer.
generations.get('/', async (c) => {
  const user = c.get('user')
  const influencer = c.req.query('influencer')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  let sql = 'SELECT * FROM generations WHERE user_id = ?'
  const binds = [user.id]
  if (influencer) { sql += ' AND influencer_id = ?'; binds.push(influencer) }
  sql += ' ORDER BY created_at DESC LIMIT ?'; binds.push(limit)
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ generations: results.map(toClient) })
})

// Poll a single generation's status/result.
generations.get('/:id', async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare('SELECT * FROM generations WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(toClient(row))
})

// Cancel while still queued (best-effort; provider cancel wired with submit in Phase 3 next).
generations.post('/:id/cancel', async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare('SELECT * FROM generations WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), user.id).first()
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.status !== 'queued') return c.json({ error: 'not_cancellable', status: row.status }, 409)
  const acct = c.env.CREDIT_ACCOUNT.get(c.env.CREDIT_ACCOUNT.idFromName(user.id))
  if (row.hold_id) await acct.release(user.id, row.hold_id, 'cancelled')
  await c.env.DB.prepare('UPDATE generations SET status = ? WHERE id = ?').bind('cancelled', row.id).run()
  // TODO(phase-3): also call provider cancel if a provider_request_id exists.
  return c.json({ ok: true })
})

export default generations
