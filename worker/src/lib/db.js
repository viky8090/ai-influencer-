// Thin D1 helpers. Every creative-domain read is tenant-scoped by user_id (FR-A7).
export const nowMs = () => Date.now()

export function getUserByClerkId(db, clerkUserId) {
  return db.prepare('SELECT * FROM users WHERE clerk_user_id = ?').bind(clerkUserId).first()
}

export function getUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
}

// Fetch a row from a creative-domain table, enforcing ownership. `table` is always an
// internal constant (never user input), so the interpolation is safe.
export function ownedRow(db, table, id, userId) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).bind(id, userId).first()
}
