// Brand deals CRUD — /api/brand-deals (PRD §13, §14). Replaces the localStorage
// 'brand_deals' collection. Tenant-scoped; full deal object stored losslessly in
// images_json; id namespaced userId::clientId (seed deal ids are shared across users).
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'

const brandDeals = new Hono()

const SEP = '::'
const sid = (u, cid) => `${u}${SEP}${cid}`
const toCid = (s) => { const i = s.indexOf(SEP); return i >= 0 ? s.slice(i + SEP.length) : s }

brandDeals.get('/', async (c) => {
  const u = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT id, images_json FROM brand_deals WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).bind(u.id).all()
  const deals = results.map((r) => {
    try { const o = JSON.parse(r.images_json || '{}'); if (!o.id) o.id = toCid(r.id); return o }
    catch { return { id: toCid(r.id) } }
  })
  return c.json({ deals })
})

brandDeals.put('/', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => null)
  const list = body?.deals
  if (!Array.isArray(list)) return c.json({ error: 'bad_request' }, 400)

  const ts = nowMs()
  const existing = await c.env.DB.prepare('SELECT id FROM brand_deals WHERE user_id = ?').bind(u.id).all()
  const existingIds = new Set(existing.results.map((r) => r.id))
  const keep = new Set()
  const stmts = []

  list.forEach((d, i) => {
    const id = sid(u.id, d.id || ulid())
    keep.add(id)
    const json = JSON.stringify({ ...d, id: toCid(id) })
    if (existingIds.has(id)) {
      stmts.push(c.env.DB.prepare('UPDATE brand_deals SET influencer_id=?, brand=?, category=?, images_json=?, sort_order=? WHERE id=? AND user_id=?').bind(d.influencerId ?? null, d.brand ?? null, d.category ?? null, json, i, id, u.id))
    } else {
      stmts.push(c.env.DB.prepare('INSERT INTO brand_deals (id, user_id, influencer_id, brand, category, images_json, sort_order, created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id, u.id, d.influencerId ?? null, d.brand ?? null, d.category ?? null, json, i, ts))
    }
  })
  for (const id of existingIds) if (!keep.has(id)) stmts.push(c.env.DB.prepare('DELETE FROM brand_deals WHERE id=? AND user_id=?').bind(id, u.id))
  if (stmts.length) await c.env.DB.batch(stmts)

  return c.json({ ok: true, count: list.length })
})

export default brandDeals
