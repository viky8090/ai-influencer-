// Higgsfield generation webhook — POST /webhooks/higgsfield
// Security: optional shared-secret check + always re-poll HF status API before settle/release.
import { Hono } from 'hono'
import { claimWebhookEvent, markWebhookProcessed } from '../lib/idempotency.js'
import { confirmFromProvider } from '../lib/delivery.js'
import { verifyHiggsfieldWebhook } from '../lib/webhookVerify.js'

const higgsfield = new Hono()

higgsfield.post('/', async (c) => {
  const raw = await c.req.text()
  const headers = Object.fromEntries(c.req.raw.headers.entries())

  const verdict = await verifyHiggsfieldWebhook(c.env, raw, headers)
  if (!verdict.ok && !verdict.soft) {
    return c.json({ error: 'unauthorized', detail: verdict.error }, 401)
  }

  let payload
  try { payload = JSON.parse(raw) } catch { return c.json({ error: 'bad_json' }, 400) }
  const requestId = payload?.request_id
  if (!requestId) return c.json({ error: 'bad_request' }, 400)

  const first = await claimWebhookEvent(c.env.DB, 'higgsfield', requestId, payload)
  if (!first) return c.json({ ok: true, duplicate: true })

  const gen = await c.env.DB.prepare('SELECT * FROM generations WHERE provider = ? AND provider_request_id = ?')
    .bind('higgsfield', requestId).first()
  if (!gen) {
    await markWebhookProcessed(c.env.DB, 'higgsfield', requestId)
    return c.json({ ok: true, unmatched: true })
  }

  try {
    const result = await confirmFromProvider(c.env, gen)
    if (result.action === 'pending') {
      await c.env.DB.prepare('DELETE FROM webhook_events WHERE provider=? AND provider_request_id=?')
        .bind('higgsfield', requestId).run().catch(() => {})
      return c.json({ ok: true, pending: true })
    }
  } catch (e) {
    await c.env.DB.prepare('DELETE FROM webhook_events WHERE provider=? AND provider_request_id=?')
      .bind('higgsfield', requestId).run().catch(() => {})
    return c.json({ error: 'processing_failed', detail: String(e?.message || e).slice(0, 200) }, 500)
  }

  await markWebhookProcessed(c.env.DB, 'higgsfield', requestId)
  return c.json({ ok: true })
})

export default higgsfield
