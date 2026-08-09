// GenerationJob — coordinates a single in-flight generation's lifecycle (PRD §12.1).
// The queue consumer submits to Higgsfield; the webhook (or the cron reconciler) drives
// the job to a terminal state and tells the user's CreditAccount to settle or release.
//
// STATUS: Phase 0b skeleton. TODO(phase-3): wire submit → webhook/poll → settle/release,
// R2 asset copy, and live progress (SSE/WebSocket) to the client.
import { DurableObject } from 'cloudflare:workers'

export class GenerationJob extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
  }

  // Begin tracking a queued generation (called by the queue consumer after the hold).
  async start(generationId, meta) {
    await this.ctx.storage.put('job', { generationId, meta, status: 'queued', startedAt: Date.now() })
    // TODO(phase-3): submit to the provider, store provider_request_id, set an alarm() as a
    // poll fallback in case the webhook never arrives.
    return { ok: true }
  }

  // Drive to terminal on a provider webhook (completed | failed | nsfw).
  async onTerminal(status, payload) {
    // TODO(phase-3): copy asset → R2 (before marking delivered, FR-D1); update generations row;
    // call CreditAccount.settle (completed) or .release (failed/nsfw). Idempotent on request_id.
    return { ok: true, status }
  }

  // Alarm = poll fallback for a missed webhook (resilience parity, §12.3).
  async alarm() {
    // TODO(phase-3): GET /requests/{id}/status; if terminal, run onTerminal; else re-arm alarm.
  }
}
