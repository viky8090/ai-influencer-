// User-mirror creation — shared by the Clerk webhook AND the auth middleware so the D1
// mirror lands exactly once regardless of which path wins the race.
import { ulid } from './ids.js'

// Free account = explore only (no generation credits). Paid entry is Starter $5 / 200 VC.
// FREE_* kept at 0 so the cron path is a no-op without deleting the scheduled job.
export const FREE_SIGNUP_CREDITS = 0
export const FREE_MONTHLY_CREDITS = 0
export const FREE_RENEW_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

// Ensure a D1 user mirror exists for this Clerk identity and return it.
// `email` must be non-null (users.email is UNIQUE NOT NULL) — callers fetch it from Clerk.
//
// Three cases, in order:
//   1. Row already exists for this clerk_user_id → return it.
//   2. Row exists for the same (verified) EMAIL under a different clerk_user_id — happens
//      when Clerk re-issues user ids, e.g. the dev→prod instance cutover (2026-07-10).
//      Re-link the row to the new id so the account (credits, influencers, history)
//      survives the migration. Without this, the INSERT below violates the UNIQUE email
//      constraint and every API call for the new identity 401s.
//   3. Genuinely new user → INSERT (idempotent against webhook/auth races).
export async function ensureUserMirror(env, { clerkUserId, email, displayName = null, avatarKey = null }) {
  const ts = Date.now()

  const byClerk = await env.DB.prepare('SELECT * FROM users WHERE clerk_user_id = ?')
    .bind(clerkUserId).first()
  if (byClerk) return byClerk

  const relinked = await env.DB.prepare(
    'UPDATE users SET clerk_user_id = ?, updated_at = ? WHERE email = ? RETURNING *'
  ).bind(clerkUserId, ts, email).first()
  if (relinked) {
    console.log(`user mirror re-linked by email: ${email} → ${clerkUserId}`)
    return relinked
  }

  const id = ulid()
  await env.DB.prepare(
    `INSERT INTO users (id, clerk_user_id, email, display_name, avatar_r2_key, role, status, free_credits_renew_at, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(clerk_user_id) DO NOTHING`
  ).bind(id, clerkUserId, email, displayName, avatarKey, 'user', 'active', null, ts, ts).run()

  return env.DB.prepare('SELECT * FROM users WHERE clerk_user_id = ?').bind(clerkUserId).first()
}
