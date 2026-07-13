// Billing — /api/billing (PRD §11). Polar.sh Merchant-of-Record: checkout (subs + packs),
// customer portal, top-ups. Money truth is webhook-driven (see webhooks/polar.js); these
// endpoints only create Polar sessions and deep-link to the hosted portal.
import { Hono } from 'hono'
import { isPolarConfigured, createCheckout, createPortalSession, PolarError } from '../lib/polar.js'

const billing = new Hono()

const PLAN_KEYS = ['starter', 'creator', 'pro', 'studio']
const PACK_KEYS = ['small', 'medium', 'large', 'mega']

// polar_products maps product ids → internal plan/pack. Plans come in monthly/annual
// variants (interval column) and, for Creator/Pro/Studio, multiple credit tiers per
// interval (same plan_or_pack, different grant_vc — the pricing-page slider). `credits`
// is the MONTHLY tier size; annual rows grant 12×. Omitted credits → smallest tier.
async function lookupProduct(db, key, interval, credits) {
  if (PACK_KEYS.includes(key)) {
    return db.prepare("SELECT * FROM polar_products WHERE kind = 'pack' AND plan_or_pack = ?")
      .bind(key).first()
  }
  if (PLAN_KEYS.includes(key)) {
    const iv = interval === 'year' ? 'year' : 'month'
    const wanted = Number(credits)
    if (Number.isFinite(wanted) && wanted > 0) {
      const grantVc = iv === 'year' ? wanted * 12 : wanted
      const row = await db.prepare(
        "SELECT * FROM polar_products WHERE kind = 'plan' AND plan_or_pack = ? AND interval = ? AND grant_vc = ?"
      ).bind(key, iv, grantVc).first()
      if (row) return row
      return null // an explicit tier that doesn't exist is a 404, not a silent downgrade
    }
    return db.prepare(
      "SELECT * FROM polar_products WHERE kind = 'plan' AND plan_or_pack = ? AND interval = ? ORDER BY grant_vc ASC LIMIT 1"
    ).bind(key, iv).first()
  }
  return null
}

async function startCheckout(c, allowedKeys) {
  if (!isPolarConfigured(c.env)) return c.json({ error: 'billing_not_configured' }, 503)
  const u = c.get('user')
  const { key, interval, credits } = await c.req.json().catch(() => ({}))
  if (!allowedKeys.includes(key)) return c.json({ error: 'unknown_product' }, 404)

  const product = await lookupProduct(c.env.DB, key, interval, credits)
  if (!product) return c.json({ error: 'unknown_product' }, 404)

  try {
    const session = await createCheckout(c.env, {
      productId: product.polar_product_id,
      userId: u.id,
      email: u.email,
      successUrl: `${c.env.APP_URL}/dashboard?checkout=success&checkout_id={CHECKOUT_ID}`,
    })
    return c.json({ url: session.url, id: session.id })
  } catch (e) {
    console.error('polar checkout failed:', String(e?.message || e))
    return c.json({ error: 'checkout_failed' }, 502)
  }
}

// Create a Polar Checkout session for a plan or pack. { key, interval? } → { url }.
billing.post('/checkout', (c) => startCheckout(c, [...PLAN_KEYS, ...PACK_KEYS]))

// Buy a one-off credit pack (packs only — used by the paywall modal).
billing.post('/topup', (c) => startCheckout(c, PACK_KEYS))

// Deep-link to the Polar customer portal (plan changes, payment methods, invoices).
billing.post('/portal', async (c) => {
  if (!isPolarConfigured(c.env)) return c.json({ error: 'billing_not_configured' }, 503)
  const u = c.get('user')
  try {
    const session = await createPortalSession(c.env, u.id)
    return c.json({ url: session.customer_portal_url })
  } catch (e) {
    // Polar has no customer for this user yet (nothing ever purchased).
    if (e instanceof PolarError && e.status === 404) return c.json({ error: 'no_billing_history' }, 404)
    console.error('polar portal failed:', String(e?.message || e))
    return c.json({ error: 'portal_failed' }, 502)
  }
})

// Current plan for the Billing UI. Canceled-with-access-remaining still reports the paid
// plan (Polar keeps status=active + cancel_at_period_end until the period actually ends).
billing.get('/plan', async (c) => {
  const u = c.get('user')
  const sub = await c.env.DB.prepare(
    `SELECT plan, status, current_period_end, cancel_at_period_end FROM subscriptions
     WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(u.id).first()
  const active = sub && (sub.status === 'active' || sub.status === 'past_due')
  return c.json({
    plan: active ? sub.plan : 'free',
    subscription: sub || null,
    configured: isPolarConfigured(c.env),
  })
})

export default billing
