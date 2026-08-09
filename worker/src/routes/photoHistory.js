// Photo Studio history — /api/photo-history (PRD §13, G5). Server mirror of the localStorage
// 'photo_studio_history' collection so a cleared cache no longer wipes a user's photo history.
// Tenant-scoped; full item stored losslessly in item_json; id namespaced userId::histId.
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'

const photoHistory = new Hono()

const SEP = '::'
const sid = (u, cid) => `${u}${SEP}${cid}`
const toCid = (s) => { const i = s.indexOf(SEP); return i >= 0 ? s.slice(i + SEP.length) : s }

photoHistory.get('/', async (c) => {
  const u = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT id, item_json FROM photo_history WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).bind(u.id).all()
  const items = results.map((r) => {
    try { const o = JSON.parse(r.item_json || '{}'); if (!o.histId) o.histId = toCid(r.id); return o }
    catch { return { histId: toCid(r.id) } }
  })
  return c.json({ items })
})

photoHistory.put('/', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => null)
  const list = body?.items
  if (!Array.isArray(list)) return c.json({ error: 'bad_request' }, 400)

  const ts = nowMs()
  const existing = await c.env.DB.prepare('SELECT id FROM photo_history WHERE user_id = ?').bind(u.id).all()
  const existingIds = new Set(existing.results.map((r) => r.id))
  const keep = new Set()
  const stmts = []

  list.forEach((item, i) => {
    const cid = item.histId || item.url || ulid()
    const id = sid(u.id, cid)
    if (keep.has(id)) return // de-dup within a single payload
    keep.add(id)
    const json = JSON.stringify({ ...item, histId: toCid(id) })
    if (existingIds.has(id)) {
      stmts.push(c.env.DB.prepare('UPDATE photo_history SET url=?, item_json=?, sort_order=? WHERE id=? AND user_id=?').bind(item.url ?? null, json, i, id, u.id))
    } else {
      stmts.push(c.env.DB.prepare('INSERT INTO photo_history (id, user_id, url, item_json, sort_order, created_at) VALUES (?,?,?,?,?,?)').bind(id, u.id, item.url ?? null, json, i, item.createdAt || ts))
    }
  })
  for (const id of existingIds) if (!keep.has(id)) stmts.push(c.env.DB.prepare('DELETE FROM photo_history WHERE id=? AND user_id=?').bind(id, u.id))
  if (stmts.length) await c.env.DB.batch(stmts)

  return c.json({ ok: true, count: keep.size })
})

export default photoHistory
