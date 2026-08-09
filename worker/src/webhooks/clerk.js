// Clerk identity webhook — POST /webhooks/clerk (PRD §9.1, §14).
// Keeps the D1 user mirror in sync and grants one-time free credits on signup.
// Clerk signs with Svix (svix-id / svix-timestamp / svix-signature headers); we verify the
// signature on the RAW body, then dedupe on svix-id (idempotent — Clerk retries).
import { Hono } from 'hono'
import { Webhook } from 'svix'
import { nowMs } from '../lib/ids.js'
import { claimWebhookEvent, markWebhookProcessed } from '../lib/idempotency.js'
import { ensureUserMirror } from '../lib/users.js'

const clerk = new Hono()

clerk.post('/', async (c) => {
  const secret = c.env.CLERK_WEBHOOK_SECRET
  if (!secret) return c.json({ error: 'webhook_not_configured' }, 500)

  // Svix verifies over the RAW request body — read it before any parsing.
  const raw = await c.req.text()
  const headers = {
    'svix-id': c.req.header('svix-id'),
    'svix-timestamp': c.req.header('svix-timestamp'),
    'svix-signature': c.req.header('svix-signature'),
  }

  let event
  try {
    event = new Webhook(secret).verify(raw, headers)
  } catch (e) {
    return c.json({ error: 'invalid_signature' }, 400)
  }

  const eventId = headers['svix-id'] || event?.data?.id
  if (!eventId) return c.json({ error: 'bad_request' }, 400)

  const first = await claimWebhookEvent(c.env.DB, 'clerk', eventId, event)
  if (!first) return c.json({ ok: true, duplicate: true })

  try {
    switch (event.type) {
      case 'user.created':
        await onUserCreated(c.env, event.data)
        break
      case 'user.updated':
        await onUserUpdated(c.env, event.data)
        break
      case 'user.deleted':
        await onUserDeleted(c.env, event.data)
        break
      default:
        break // ignore other event types
    }
  } catch (e) {
    // Transient failure → 500 so Clerk retries (the dedupe row is rewritten on retry).
    return c.json({ error: 'processing_failed', detail: String(e?.message || e) }, 500)
  }

  await markWebhookProcessed(c.env.DB, 'clerk', eventId)
  return c.json({ ok: true })
})

function primaryEmail(data) {
  const list = data.email_addresses || []
  const primary = list.find((e) => e.id === data.primary_email_address_id) || list[0]
  return primary?.email_address || null
}

function displayName(data) {
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
  return name || null
}

async function onUserCreated(env, data) {
  // Idempotent create + one-time free grant (shared with the auth middleware's lazy-create, so
  // the credits are granted exactly once whichever path wins the race).
  await ensureUserMirror(env, {
    clerkUserId: data.id,
    email: primaryEmail(data),
    displayName: displayName(data),
    avatarKey: data.image_url || null,
  })
  // Refresh profile fields on the row in case the auth path created it first with stale/missing data.
  await env.DB.prepare(
    `UPDATE users SET email = ?, display_name = ?, avatar_r2_key = ?, updated_at = ? WHERE clerk_user_id = ?`
  ).bind(primaryEmail(data), displayName(data), data.image_url || null, nowMs(), data.id).run()
}

async function onUserUpdated(env, data) {
  await env.DB.prepare(
    `UPDATE users SET email = ?, display_name = ?, avatar_r2_key = ?, updated_at = ? WHERE clerk_user_id = ?`
  ).bind(primaryEmail(data), displayName(data), data.image_url || null, nowMs(), data.id).run()
}

async function onUserDeleted(env, data) {
  // Soft-delete; PII purge + asset cleanup scheduled separately (§17.5).
  await env.DB.prepare(
    `UPDATE users SET status = 'deleted', updated_at = ? WHERE clerk_user_id = ?`
  ).bind(nowMs(), data.id).run()
}

export default clerk
