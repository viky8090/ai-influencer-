// Influencers CRUD — /api/influencers (PRD §13, §15.1). Replaces store.jsx localStorage.
// Every handler is tenant-scoped by c.get('user').id (FR-A7). The full client influencer
// object is stored losslessly in data_json; a few columns are promoted for server queries.
//
// Client influencer ids are only unique per-user (seed ids like 'kayla-template' are shared),
// but influencers.id is a global PK — so the stored id is namespaced `userId::clientId`. The
// client always sees its own original id (from data_json); the namespacing is server-internal.
// sort_order preserves the user's influencer sequence across server round-trips.
import { Hono } from 'hono'
import { ulid, nowMs } from '../lib/ids.js'

const influencers = new Hono()

const SEP = '::'
const storedId = (userId, clientId) => `${userId}${SEP}${clientId}`
const toClientId = (sid) => { const i = sid.indexOf(SEP); return i >= 0 ? sid.slice(i + SEP.length) : sid }

function rowFromClient(userId, inf) {
  const cid = inf.id || ulid()
  return {
    id: storedId(userId, cid),
    user_id: userId,
    name: inf.name ?? null,
    gender: inf.gender ?? null,
    type: inf.type ?? null,
    age: inf.age != null ? String(inf.age) : null,
    niche: inf.niche ?? null,
    main_image_asset: inf.mainImage ?? null,
    character_sheet_asset: inf.characterSheetImage ?? null,
    closeup1_asset: inf.closeUpImage1 ?? null,
    closeup2_asset: inf.closeUpImage2 ?? null,
    data_json: JSON.stringify({ ...inf, id: cid }),
  }
}

function clientFromRow(row) {
  try {
    const obj = JSON.parse(row.data_json || '{}')
    if (!obj.id) obj.id = toClientId(row.id)
    return obj
  } catch {
    return { id: toClientId(row.id) }
  }
}

const INSERT_SQL = `INSERT INTO influencers
  (id, user_id, name, gender, type, age, niche, main_image_asset, character_sheet_asset, closeup1_asset, closeup2_asset, sort_order, data_json, created_at, updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`

const UPDATE_SQL = `UPDATE influencers SET
  name=?, gender=?, type=?, age=?, niche=?, main_image_asset=?, character_sheet_asset=?, closeup1_asset=?, closeup2_asset=?, sort_order=?, data_json=?, updated_at=?, deleted_at=NULL
  WHERE id=? AND user_id=?`

function bindInsert(c, row, sortOrder, ts) {
  return c.env.DB.prepare(INSERT_SQL).bind(
    row.id, row.user_id, row.name, row.gender, row.type, row.age, row.niche,
    row.main_image_asset, row.character_sheet_asset, row.closeup1_asset, row.closeup2_asset, sortOrder, row.data_json, ts, ts
  )
}
function bindUpdate(c, row, sortOrder, ts) {
  return c.env.DB.prepare(UPDATE_SQL).bind(
    row.name, row.gender, row.type, row.age, row.niche,
    row.main_image_asset, row.character_sheet_asset, row.closeup1_asset, row.closeup2_asset, sortOrder, row.data_json, ts, row.id, row.user_id
  )
}

// List the user's influencers in their saved order.
influencers.get('/', async (c) => {
  const u = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT id, data_json FROM influencers WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC'
  ).bind(u.id).all()
  return c.json({ influencers: results.map(clientFromRow) })
})

// Bulk replace — mirrors the old "persist the whole list" semantics, atomically (D1 batch).
// Upserts every influencer (stamping its list position) and soft-deletes any of the user's
// that are absent.
influencers.put('/', async (c) => {
  const u = c.get('user')
  const body = await c.req.json().catch(() => null)
  const list = body?.influencers
  if (!Array.isArray(list)) return c.json({ error: 'bad_request' }, 400)

  const ts = nowMs()
  const existing = await c.env.DB.prepare(
    'SELECT id FROM influencers WHERE user_id = ? AND deleted_at IS NULL'
  ).bind(u.id).all()
  const existingIds = new Set(existing.results.map((r) => r.id))
  const keepIds = new Set()

  const stmts = []
  list.forEach((inf, i) => {
    const row = rowFromClient(u.id, inf)
    keepIds.add(row.id)
    stmts.push(existingIds.has(row.id) ? bindUpdate(c, row, i, ts) : bindInsert(c, row, i, ts))
  })
  for (const id of existingIds) {
    if (!keepIds.has(id)) {
      stmts.push(c.env.DB.prepare('UPDATE influencers SET deleted_at = ? WHERE id = ? AND user_id = ?').bind(ts, id, u.id))
    }
  }
  if (stmts.length) await c.env.DB.batch(stmts)

  return c.json({ ok: true, count: list.length })
})

// Single delete (soft). Param is the client's original id.
influencers.delete('/:id', async (c) => {
  const u = c.get('user')
  await c.env.DB.prepare('UPDATE influencers SET deleted_at = ? WHERE id = ? AND user_id = ?')
    .bind(nowMs(), storedId(u.id, c.req.param('id')), u.id).run()
  return c.json({ ok: true })
})

export default influencers
