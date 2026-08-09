// Inspiration boards CRUD — /api/inspiration (PRD §13, §14). Replaces the localStorage
// 'inspiration_boards' collection. Tenant-scoped; full board object stored losslessly in
// items_json; id namespaced userId::clientId (seed board ids are shared across users).
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'

const inspiration = new Hono()

const SEP = '::'
const sid = (u, cid) => `${u}${SEP}${cid}`
const toCid = (s) => { const i = s.indexOf(SEP); return i >= 0 ? s.slice(i + SEP.length) : s }

inspiration.get('/', async (c) => {
  const u = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT id, items_json FROM inspiration_boards WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).bind(u.id).all()
  const boards = results.map((r) => {
    try { const o = JSON.parse(r.items_json || '{}'); if (!o.id) o.id = toCid(r.id); return o }
    catch { return { id: toCid(r.id) } }
  })
  return c.json({ boards })
})

inspiration.put('/', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => null)
  const list = body?.boards
  if (!Array.isArray(list)) return c.json({ error: 'bad_request' }, 400)

  const ts = nowMs()
  const existing = await c.env.DB.prepare('SELECT id FROM inspiration_boards WHERE user_id = ?').bind(u.id).all()
  const existingIds = new Set(existing.results.map((r) => r.id))
  const keep = new Set()
  const stmts = []

  list.forEach((b, i) => {
    const id = sid(u.id, b.id || ulid())
    keep.add(id)
    const json = JSON.stringify({ ...b, id: toCid(id) })
    if (existingIds.has(id)) {
      stmts.push(c.env.DB.prepare('UPDATE inspiration_boards SET title=?, items_json=?, sort_order=?, updated_at=? WHERE id=? AND user_id=?').bind(b.title ?? null, json, i, ts, id, u.id))
    } else {
      stmts.push(c.env.DB.prepare('INSERT INTO inspiration_boards (id, user_id, title, items_json, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').bind(id, u.id, b.title ?? null, json, i, ts, ts))
    }
  })
  for (const id of existingIds) if (!keep.has(id)) stmts.push(c.env.DB.prepare('DELETE FROM inspiration_boards WHERE id=? AND user_id=?').bind(id, u.id))
  if (stmts.length) await c.env.DB.batch(stmts)

  return c.json({ ok: true, count: list.length })
})

export default inspiration
