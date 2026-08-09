// Vymotion API — Cloudflare Worker entrypoint (PRD §12).
// Hono app for /api/* (Clerk-authenticated) and /webhooks/* (signature-verified).
// Also exports the Durable Object classes and the queue/cron handlers.
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './lib/auth.js'

import me from './routes/me.js'
import credits from './routes/credits.js'
import generate from './routes/generate.js'
import generations from './routes/generations.js'
import influencers from './routes/influencers.js'
import inspiration from './routes/inspiration.js'
import brandDeals from './routes/brandDeals.js'
import photoHistory from './routes/photoHistory.js'
import assets from './routes/assets.js'
import uploads, { publicRefs, publicAssets } from './routes/uploads.js'
import billing from './routes/billing.js'
import admin from './routes/admin.js'
import social, { syncSocialPosts } from './routes/social.js'

import higgsfieldWebhook from './webhooks/higgsfield.js'
import falWebhook from './webhooks/fal.js'
import polarWebhook from './webhooks/polar.js'
import clerkWebhook from './webhooks/clerk.js'
import { confirmFromProvider, releaseAndFail } from './lib/delivery.js'
import { FREE_MONTHLY_CREDITS, FREE_RENEW_INTERVAL_MS } from './lib/users.js'
import { syncPolarB3 } from './lib/syncPolarB3.js'

// Durable Objects (declared in wrangler.toml).
export { CreditAccount } from './do/creditAccount.js'
export { GenerationJob } from './do/generationJob.js'

// Reconciler: re-poll provider (same path as webhooks). Returns true when terminal.
async function recoverFromProvider(env, g) {
  if (!g.provider_request_id) return false
  const r = await confirmFromProvider(env, g)
  return r.action === 'delivered' || r.action === 'released'
}

// Constant-time string compare (Workers has no timingSafeEqual) — avoids leaking the secret
// length/prefix via response timing. Returns false fast only on the length mismatch.
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const app = new Hono()

app.get('/health', (c) =>
  c.json({ ok: true, service: 'vymotion-api', env: c.env.ENVIRONMENT })
)

// Webhooks are unauthenticated at the session layer — each verifies a provider signature
// instead — so they mount BEFORE the Clerk auth middleware.
app.route('/webhooks/higgsfield', higgsfieldWebhook)
app.route('/webhooks/fal', falWebhook)
app.route('/webhooks/polar', polarWebhook)
app.route('/webhooks/clerk', clerkWebhook)

// Internal ops grant — mint credits to a user by email (§19 goodwill credits / testing).
// Secret-gated with the ADMIN_SECRET Worker secret (constant-time compare), NOT a Clerk
// session, so it mounts outside /api/* and is safe to curl server-to-server. Goes through the
// CreditAccount DO so the in-memory balance and D1 ledger stay in sync (a direct D1 write would
// be silently overwritten by a warm DO).
app.post('/internal/grant', async (c) => {
  const secret = c.env.ADMIN_SECRET
  const provided = c.req.header('x-admin-secret') || ''
  if (!secret || !timingSafeEqualStr(provided, secret)) return c.json({ error: 'forbidden' }, 403)

  const body = await c.req.json().catch(() => ({}))
  const email = String(body.email || '').trim()
  const amount = Math.round(Number(body.amount))
  const bucket = body.bucket === 'subscription' ? 'subscription' : 'topup'
  const reason = String(body.reason || 'admin_grant')
  if (!email || !Number.isFinite(amount) || amount <= 0) return c.json({ error: 'bad_request' }, 400)

  const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first()
  if (!user) return c.json({ error: 'user_not_found' }, 404)

  const stub = c.env.CREDIT_ACCOUNT.get(c.env.CREDIT_ACCOUNT.idFromName(user.id))
  const balance = await stub.grant(user.id, amount, bucket, { reason, actor: 'admin' })
  return c.json({ ok: true, user: user.email, granted: amount, bucket, balance })
})

// One-shot B3 pricing sync — archives old Polar products, creates B3 catalog, rewrites D1
// polar_products. Gated by ADMIN_SECRET (same as /internal/grant). Safe to re-run.
app.post('/internal/sync-b3-pricing', async (c) => {
  const secret = c.env.ADMIN_SECRET
  const provided = c.req.header('x-admin-secret') || ''
  if (!secret || !timingSafeEqualStr(provided, secret)) return c.json({ error: 'forbidden' }, 403)
  try {
    const result = await syncPolarB3(c.env)
    if (!result.ok) return c.json(result, 503)
    return c.json(result)
  } catch (e) {
    console.error('sync-b3-pricing failed:', String(e?.message || e))
    return c.json({ error: 'sync_failed', detail: String(e?.message || e).slice(0, 400) }, 502)
  }
})

// Public reference images (unguessable ULID ids; only kind='ref' assets) — Higgsfield fetches
// these during generation, so they sit outside the Clerk auth middleware.
app.route('/public/refs', publicRefs)
app.route('/public/assets', publicAssets)

// CORS for the browser SPA — must precede auth so the OPTIONS preflight succeeds without a token.
app.use('/api/*', cors({
  origin: (origin) =>
    origin && (origin.startsWith('http://localhost') || origin === 'https://vymotion.org' || origin === 'https://www.vymotion.org')
      ? origin
      : '',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400,
}))

// Everything under /api requires a valid Clerk session.
app.use('/api/*', authMiddleware)
app.route('/api/me', me)
app.route('/api/credits', credits)
app.route('/api/generate', generate)
app.route('/api/generations', generations)
app.route('/api/influencers', influencers)
app.route('/api/inspiration', inspiration)
app.route('/api/brand-deals', brandDeals)
app.route('/api/photo-history', photoHistory)
app.route('/api/assets', assets)
app.route('/api/uploads', uploads)
app.route('/api/billing', billing)
app.route('/api/admin', admin)
app.route('/api/social', social)

app.notFound((c) => c.json({ error: 'not_found' }, 404))

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),

  // Queue consumer — async generation + asset-copy jobs (decouples submit from the slow
  // 30s–9min generation). TODO(phase-3): submit to Higgsfield, register webhook, handle retries.
  async queue(batch, env, ctx) {
    for (const msg of batch.messages) {
      try {
        // TODO(phase-3): process generation job (GenerationJob DO).
        msg.ack()
      } catch (e) {
        msg.retry()
      }
    }
  },

  // Cron reconciler — close out generations whose webhook never arrived so no hold is stranded
  // (§10.3 step 5, §12.3). Polls the provider first: a completion webhook may just be lost/late
  // (providers retry for ~2h), in which case the outputs are delivered instead of refunded.
  // Only genuinely dead jobs release the hold and mark failed.
  async scheduled(event, env, ctx) {
    const cutoff = Date.now() - 20 * 60 * 1000 // 4K popcorn runs have taken 7½ min; leave headroom
    const { results } = await env.DB.prepare(
      "SELECT * FROM generations WHERE status IN ('queued','in_progress') AND created_at < ? LIMIT 100"
    ).bind(cutoff).all()
    for (const g of results) {
      try {
        const done = await recoverFromProvider(env, g)
        if (done) continue
        // Still pending after re-poll and past cutoff → refund timeout
        await releaseAndFail(env, g, 'failed', 'timeout')
      } catch (e) { /* next tick retries — don't refund if provider unreachable */ }
    }

    await refreshFreeCredits(env)

    // Flip overdue scheduled social posts to published/error from Postiz (§12.8 —
    // the Public API has no outbound webhooks; polling is the supported pattern).
    try { await syncSocialPosts(env) } catch (e) { /* next tick retries */ }
  },
}

// Monthly free-tier refresh — no-op when FREE_MONTHLY_CREDITS is 0 (explore-only free).
// Paid users' monthly grants come from Polar webhooks.
async function refreshFreeCredits(env) {
  if (!FREE_MONTHLY_CREDITS || FREE_MONTHLY_CREDITS <= 0) return
  const now = Date.now()
  const { results } = await env.DB.prepare(
    `SELECT u.id FROM users u
     LEFT JOIN subscriptions s
       ON s.user_id = u.id AND s.status IN ('active','past_due')
       AND s.plan IN ('starter','creator','pro','studio')
     WHERE u.status = 'active' AND u.free_credits_renew_at IS NOT NULL AND u.free_credits_renew_at <= ? AND s.id IS NULL
     LIMIT 100`
  ).bind(now).all()

  for (const u of results) {
    try {
      const stub = env.CREDIT_ACCOUNT.get(env.CREDIT_ACCOUNT.idFromName(u.id))
      await stub.grantCycle(u.id, FREE_MONTHLY_CREDITS, { reason: 'free_monthly' })
      await env.DB.prepare('UPDATE users SET free_credits_renew_at = ? WHERE id = ?')
        .bind(now + FREE_RENEW_INTERVAL_MS, u.id).run()
    } catch (e) { /* next tick retries this user */ }
  }
}
