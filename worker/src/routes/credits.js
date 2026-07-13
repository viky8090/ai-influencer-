// Credit balance + ledger — GET /api/credits, /api/credits/ledger (PRD §10.4, §14).
import { Hono } from 'hono'

const credits = new Hono()

// One retry for transient DO/D1 hiccups ("Durable Object reset", D1 storage errors) so a
// blip never surfaces as a raw 500. Persistent failure → 503 balance_unavailable, which the
// frontend soft-fails into its last-known number instead of a blank chip.
async function withRetry(fn) {
  try {
    return await fn()
  } catch (e) {
    await new Promise((r) => setTimeout(r, 150))
    return fn()
  }
}

// Balance + breakdown (subscription vs top-up) from the user's CreditAccount DO.
credits.get('/', async (c) => {
  const u = c.get('user')
  try {
    const bal = await withRetry(() => {
      const stub = c.env.CREDIT_ACCOUNT.get(c.env.CREDIT_ACCOUNT.idFromName(u.id))
      return stub.balance(u.id) // { subscription_vc, topup_vc, total, held }
    })
    return c.json(bal)
  } catch (e) {
    console.error('credits balance failed:', String(e?.message || e))
    return c.json({ error: 'balance_unavailable' }, 503)
  }
})

// Paginated ledger history, newest first (CSV export handled client-side). FR-C11.
// Generation-referenced entries are enriched with the generation's kind/model/status so the
// Usage page can say "Image generation — GPT Image 2" instead of a bare ledger row.
// Optional ?kind=grant|hold|spend|release|expire filter.
credits.get('/ledger', async (c) => {
  const u = c.get('user')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0
  const kind = c.req.query('kind') || null
  try {
    const { results } = await withRetry(() =>
      c.env.DB.prepare(
        `SELECT l.id, l.kind, l.amount, l.balance_after, l.bucket, l.ref_type, l.ref_id, l.reason,
                l.expires_at, l.created_at,
                g.kind AS gen_kind, g.model AS gen_model, g.status AS gen_status
         FROM credit_ledger l
         LEFT JOIN generations g ON l.ref_type = 'generation' AND g.id = l.ref_id
         WHERE l.user_id = ? AND (? IS NULL OR l.kind = ?)
         ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
      ).bind(u.id, kind, kind, limit, offset).all()
    )
    return c.json({ entries: results, limit, offset })
  } catch (e) {
    console.error('credits ledger failed:', String(e?.message || e))
    return c.json({ error: 'ledger_unavailable' }, 503)
  }
})

export default credits
