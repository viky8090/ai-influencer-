// Clerk session verification middleware — mounted on /api/*.
// Workers verify Clerk-issued JWTs on every API call (PRD §9.1). D1 stores only a
// mirror keyed by clerk_user_id; the mirror is created by the Clerk webhook.
import { verifyToken, createClerkClient } from '@clerk/backend'
import { getUserByClerkId } from './db.js'
import { ensureUserMirror } from './users.js'

function getToken(c) {
  const auth = c.req.header('Authorization')
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7)
  const cookie = c.req.header('Cookie') || ''
  const m = cookie.match(/__session=([^;]+)/)
  return m ? m[1] : null
}

export async function authMiddleware(c, next) {
  const token = getToken(c)
  if (!token) return c.json({ error: 'unauthorized' }, 401)

  const claims = await verifyClerkToken(c.env, token)
  if (!claims) return c.json({ error: 'unauthorized' }, 401)

  let user = await getUserByClerkId(c.env.DB, claims.sub)
  // The Clerk user.created webhook is async — a fresh session can hit /api/* before the mirror
  // exists. Rather than 401, lazy-create it here (idempotent with the webhook) so signup credits
  // + profile are available immediately. Session JWTs don't carry email, so fetch it from Clerk.
  if (!user) {
    user = await lazyCreateMirror(c.env, claims.sub)
    if (!user) return c.json({ error: 'no_user_mirror' }, 401) // Clerk fetch/insert genuinely failed
  }
  if (user.status !== 'active') return c.json({ error: `account_${user.status}` }, 403)

  c.set('user', user)
  await next()
}

// Fetch the Clerk user (for the required email + name) and create the D1 mirror + free grant.
async function lazyCreateMirror(env, clerkUserId) {
  try {
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY })
    const cu = await clerk.users.getUser(clerkUserId)
    const email =
      cu.primaryEmailAddress?.emailAddress ||
      cu.emailAddresses?.[0]?.emailAddress
    if (!email) return null // users.email is NOT NULL — can't create without one
    const displayName = [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim() || null
    return await ensureUserMirror(env, {
      clerkUserId,
      email,
      displayName,
      avatarKey: cu.imageUrl || null,
    })
  } catch (e) {
    // Surfaced in `wrangler tail` — a silent null here turns into an opaque 401 for the user.
    console.error(`lazyCreateMirror failed for ${clerkUserId}:`, String(e?.message || e))
    return null
  }
}

// Verify the Clerk session JWT via @clerk/backend (fetches + caches Clerk's JWKS using the
// secret key, then checks the RS256 signature + exp). Returns decoded claims ({ sub, ... })
// or null if the token is missing/invalid/expired.
async function verifyClerkToken(env, token) {
  if (!env.CLERK_SECRET_KEY) return null
  try {
    return await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
  } catch (e) {
    return null
  }
}
