// Webhook idempotency via webhook_events UNIQUE(provider, provider_request_id).
// Higgsfield retries webhooks for up to 2h and Polar/Clerk retry too, so every handler
// must be safe to receive the same event more than once (§10.3 FR-C6, §17.2).
import { ulid } from './ids.js'

// Returns true if this is the FIRST time we've seen (provider, requestId); false if a duplicate.
export async function claimWebhookEvent(db, provider, requestId, payload) {
  try {
    await db
      .prepare(
        'INSERT INTO webhook_events (id, provider, provider_request_id, payload_json, created_at) VALUES (?,?,?,?,?)'
      )
      .bind(ulid(), provider, requestId, JSON.stringify(payload ?? null), Date.now())
      .run()
    return true
  } catch (e) {
    // UNIQUE violation → already claimed/processed.
    return false
  }
}

export async function markWebhookProcessed(db, provider, requestId) {
  await db
    .prepare('UPDATE webhook_events SET processed_at = ? WHERE provider = ? AND provider_request_id = ?')
    .bind(Date.now(), provider, requestId)
    .run()
}
