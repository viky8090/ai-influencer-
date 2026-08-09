// fal.ai generation webhook — POST /webhooks/fal
// Security: optional ED25519 signature check + always re-poll fal with our API key before
// settle/release. Webhook body is a wake-up only — forged URLs never reach R2.
import { Hono } from 'hono'
import { claimWebhookEvent, markWebhookProcessed } from '../lib/idempotency.js'
import { confirmFromProvider } from '../lib/delivery.js'
import { verifyFalWebhook } from '../lib/webhookVerify.js'

const fal = new Hono()

fal.post('/', async (c) => {
  const raw = await c.req.text()
  const headers = Object.fromEntries(c.req.raw.headers.entries())

  const verdict = await verifyFalWebhook(raw, headers)
  // Hard reject only when signature headers were present but invalid (forgery).
  // Soft miss → still re-poll (legit delivery if fal omits headers / JWKS blip).
  if (!verdict.ok && !verdict.soft) {
    return c.json({ error: 'unauthorized', detail: verdict.error }, 401)
  }

  let payload
  try { payload = JSON.parse(raw) } catch { return c.json({ error: 'bad_json' }, 400) }
  const requestId = payload?.request_id
  if (!requestId) return c.json({ error: 'bad_request' }, 400)

  const first = await claimWebhookEvent(c.env.DB, 'fal', requestId, payload)
  if (!first) return c.json({ ok: true, duplicate: true })

  const gen = await c.env.DB.prepare('SELECT * FROM generations WHERE provider = ? AND provider_request_id = ?')
    .bind('fal', requestId).first()
  if (!gen) {
    await markWebhookProcessed(c.env.DB, 'fal', requestId)
    return c.json({ ok: true, unmatched: true })
  }

  try {
    // Ignore webhook status/payload URLs — re-query fal queue API (authoritative).
    const result = await confirmFromProvider(c.env, gen)
    if (result.action === 'pending') {
      // Job still running; undo claim so a later webhook/cron can process.
      await c.env.DB.prepare('DELETE FROM webhook_events WHERE provider=? AND provider_request_id=?')
        .bind('fal', requestId).run().catch(() => {})
      return c.json({ ok: true, pending: true })
    }
  } catch (e) {
    await c.env.DB.prepare('DELETE FROM webhook_events WHERE provider=? AND provider_request_id=?')
      .bind('fal', requestId).run().catch(() => {})
    return c.json({ error: 'processing_failed', detail: String(e?.message || e).slice(0, 200) }, 500)
  }

  await markWebhookProcessed(c.env.DB, 'fal', requestId)
  return c.json({ ok: true })
})

export default fal
