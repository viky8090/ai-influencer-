// Polar.sh billing webhook — POST /webhooks/polar (PRD §11.2, §12.6).
// The ONLY place credits are granted from a purchase (never the client).
// Signature-verified (Standard Webhooks) on the RAW body, deduped twice:
//   1. webhook-id claim (Polar retries up to 10× with the same id)
//   2. ledger-level dedupe on the ORDER id (order.paid and a paid order.created are
//      distinct webhook events for the same money — one grant only).
import { Hono } from 'hono'
import { verifyPolarWebhook } from '../lib/polar.js'
import { claimWebhookEvent, markWebhookProcessed } from '../lib/idempotency.js'
import { ulid, nowMs } from '../lib/ids.js'

const polar = new Hono()

const TOPUP_EXPIRY_MS = 365 * 24 * 3600 * 1000 // top-up credits last 12 months (§10.5)

polar.post('/', async (c) => {
  const raw = await c.req.text()
  const headers = {
    'webhook-id': c.req.header('webhook-id'),
    'webhook-timestamp': c.req.header('webhook-timestamp'),
    'webhook-signature': c.req.header('webhook-signature'),
  }

  const verdict = await verifyPolarWebhook(c.env, raw, headers)
  if (!verdict.ok) {
    return c.json({ error: verdict.error }, verdict.error === 'not_configured' ? 500 : 400)
  }

  let event
  try { event = JSON.parse(raw) } catch { return c.json({ error: 'bad_json' }, 400) }

  const eventId = verdict.id
  const first = await claimWebhookEvent(c.env.DB, 'polar', eventId, event)
  if (!first) return c.json({ ok: true, duplicate: true })

  try {
    switch (event.type) {
      case 'order.paid':
        await onOrderPaid(c.env, event.data)
        break
      case 'order.created': // defensive: only if it already carries payment
        if (event.data?.paid === true) await onOrderPaid(c.env, event.data)
        break
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.canceled':
      case 'subscription.uncanceled':
      case 'subscription.past_due':
      case 'subscription.revoked':
        await onSubscriptionChanged(c.env, event.data)
        break
      default:
        break // ignore other event types
    }
  } catch (e) {
    // Drop the claim so Polar's retry (10×, exponential backoff) can re-process.
    await c.env.DB.prepare('DELETE FROM webhook_events WHERE provider = ? AND provider_request_id = ?')
      .bind('polar', eventId).run()
    return c.json({ error: 'processing_failed', detail: String(e?.message || e) }, 500)
  }

  await markWebhookProcessed(c.env.DB, 'polar', eventId)
  return c.json({ ok: true })
})

// Checkout sets external_customer_id = our user id, so customer.external_id is the primary
// key back to the account; metadata.user_id, polar_customer_id, and email are fallbacks.
async function resolveUser(env, data) {
  const externalId = data?.customer?.external_id || data?.metadata?.user_id
  if (externalId) {
    const u = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(externalId).first()
    if (u) return u
  }
  const polarCustomerId = data?.customer?.id || data?.customer_id
  if (polarCustomerId) {
    const u = await env.DB.prepare('SELECT * FROM users WHERE polar_customer_id = ?').bind(polarCustomerId).first()
    if (u) return u
  }
  // Email fallback removed — checkout always sets external_customer_id. Granting by email
  // alone risks mis-attributing a payment if emails collide or are attacker-controlled.
  return null
}

// polar_products row first; the product's own metadata (vy_kind/vy_key/vy_grant_vc, set at
// product creation) is the fallback so a missing mapping row can't silently drop a grant.
async function resolveProduct(env, data) {
  const productId = data?.product_id || data?.product?.id
  if (productId) {
    const row = await env.DB.prepare('SELECT * FROM polar_products WHERE polar_product_id = ?')
      .bind(productId).first()
    if (row) return { kind: row.kind, key: row.plan_or_pack, grantVc: row.grant_vc }
  }
  const meta = data?.product?.metadata || {}
  if (meta.vy_kind && meta.vy_key && meta.vy_grant_vc) {
    return { kind: String(meta.vy_kind), key: String(meta.vy_key), grantVc: Number(meta.vy_grant_vc) }
  }
  return null
}

async function onOrderPaid(env, order) {
  const user = await resolveUser(env, order)
  if (!user) throw new Error(`no user for polar order ${order?.id}`)

  const already = await env.DB.prepare(
    "SELECT id FROM credit_ledger WHERE ref_type = 'polar' AND ref_id = ? AND kind = 'grant' LIMIT 1"
  ).bind(order.id).first()
  if (already) return

  const product = await resolveProduct(env, order)
  if (!product || !product.grantVc) {
    throw new Error(`no product mapping for polar order ${order?.id} (product ${order?.product_id})`)
  }

  // Keep the Polar customer id on the user mirror (portal deep-links, reconciliation).
  if (order?.customer?.id && order.customer.id !== user.polar_customer_id) {
    await env.DB.prepare('UPDATE users SET polar_customer_id = ?, updated_at = ? WHERE id = ?')
      .bind(order.customer.id, nowMs(), user.id).run()
  }

  const stub = env.CREDIT_ACCOUNT.get(env.CREDIT_ACCOUNT.idFromName(user.id))
  const ref = { type: 'polar', id: order.id }

  if (product.kind === 'pack') {
    await stub.grant(user.id, product.grantVc, 'topup', {
      ref, reason: `pack_${product.key}`, expiresAt: Date.now() + TOPUP_EXPIRY_MS,
    })
  } else if (order.billing_reason === 'subscription_cycle') {
    // Renewal: unspent subscription credits don't roll over (FR-C15) — reset, then grant.
    await stub.grantCycle(user.id, product.grantVc, { ref, reason: `plan_${product.key}_cycle` })
  } else {
    // subscription_create / subscription_update (upgrade delta is Polar-prorated as a new order).
    await stub.grant(user.id, product.grantVc, 'subscription', {
      ref, reason: `plan_${product.key}_${order.billing_reason || 'purchase'}`,
    })
  }

  if (product.kind === 'plan' && order.subscription_id) {
    await upsertSubscription(env, user.id, {
      id: order.subscription_id, status: 'active', product_id: order.product_id,
    }, product.key)
  }
}

async function onSubscriptionChanged(env, sub) {
  const user = await resolveUser(env, sub)
  if (!user) throw new Error(`no user for polar subscription ${sub?.id}`)
  const product = await resolveProduct(env, sub)
  await upsertSubscription(env, user.id, sub, product?.key)
}

async function upsertSubscription(env, userId, sub, planKey) {
  const ts = nowMs()
  const periodEnd = sub.current_period_end ? (Date.parse(sub.current_period_end) || null) : null
  const cancelAtEnd = sub.cancel_at_period_end ? 1 : 0
  const status = sub.status || 'active'

  const existing = await env.DB.prepare('SELECT id, plan FROM subscriptions WHERE polar_subscription_id = ?')
    .bind(sub.id).first()
  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions SET plan = ?, status = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = ?
       WHERE id = ?`
    ).bind(planKey || existing.plan, status, periodEnd, cancelAtEnd, ts, existing.id).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, polar_subscription_id, plan, status, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(ulid(), userId, sub.id, planKey || 'unknown', status, periodEnd, cancelAtEnd, ts, ts).run()
  }
}

export default polar
