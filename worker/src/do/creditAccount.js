// CreditAccount — one Durable Object instance per user_id (PRD §10, §12.4).
// It owns the authoritative balance and serialises every hold/settle/release/grant so
// credits can never double-spend. Each mutation writes through to D1 (append-only
// credit_ledger + materialised credit_balance) for durability and audit.
//
// Robustness invariants:
//   • All mutating RPCs run under a promise-chain mutex — DO input gates do NOT close
//     during D1 (network) awaits, so without it two quoteAndHold calls could interleave
//     between the balance read and the write and double-spend.
//   • Balance upsert + ledger append are one atomic D1 batch.
//   • If a persist fails, in-memory state is invalidated (this.bal = null → force reload
//     from D1) and compound ops roll back their DO-storage hold entry, so a retry always
//     sees consistent state.
import { DurableObject } from 'cloudflare:workers'
import { ulid } from '../lib/ids.js'

export class CreditAccount extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.userId = null
    this.bal = null // { subscription_vc, topup_vc } — lazily loaded from D1
    this._q = Promise.resolve() // mutation mutex
  }

  // Serialise mutations. The chain swallows prior rejections so one failed op can never
  // poison the queue for the next one.
  _locked(fn) {
    const run = this._q.then(fn, fn)
    this._q = run.then(() => {}, () => {})
    return run
  }

  async _load(userId, { force = false } = {}) {
    this.userId = userId
    if (this.bal && !force) return
    const row = await this.env.DB.prepare(
      'SELECT subscription_vc, topup_vc FROM credit_balance WHERE user_id = ?'
    ).bind(userId).first()
    this.bal = row
      ? {
          subscription_vc: Math.max(0, Math.round(Number(row.subscription_vc) || 0)),
          topup_vc: Math.max(0, Math.round(Number(row.topup_vc) || 0)),
        }
      : { subscription_vc: 0, topup_vc: 0 }
  }

  _total() {
    return (this.bal?.subscription_vc || 0) + (this.bal?.topup_vc || 0)
  }

  async _persistAndLog(kind, amount, bucket, ref, reason, actor = 'system', expiresAt = null) {
    const ts = Date.now()
    try {
      await this.env.DB.batch([
        this.env.DB.prepare(
          'INSERT OR REPLACE INTO credit_balance (user_id, subscription_vc, topup_vc, updated_at) VALUES (?,?,?,?)'
        ).bind(this.userId, this.bal.subscription_vc, this.bal.topup_vc, ts),
        this.env.DB.prepare(
          `INSERT INTO credit_ledger
           (id, user_id, kind, amount, balance_after, bucket, ref_type, ref_id, reason, actor, expires_at, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          ulid(), this.userId, kind, amount, this._total(), bucket,
          ref?.type ?? null, ref?.id ?? null, reason ?? null, actor, expiresAt, ts
        ),
      ])
    } catch (e) {
      // In-memory state may now diverge from D1 — drop it so the next access reloads truth.
      this.bal = null
      throw e
    }
  }

  // ── RPC surface (called from the generation/billing Workers) ──────────

  async balance(userId) {
    // Always re-read D1 for the public balance endpoint so a warm DO never serves a
    // stale zero/blank after grants from Polar webhooks or another isolate path.
    await this._load(userId, { force: true })
    const holds = await this.ctx.storage.list({ prefix: 'hold:' })
    let held = 0
    for (const h of holds.values()) held += Number(h.amount) || 0
    const subscription_vc = this.bal.subscription_vc
    const topup_vc = this.bal.topup_vc
    const total = subscription_vc + topup_vc
    return { subscription_vc, topup_vc, total, held }
  }

  // Grant credits (subscription cycle, top-up pack, referral, admin goodwill).
  grant(userId, amount, bucket, opts = {}) {
    return this._locked(async () => {
      const { ref, reason, actor, expiresAt } = opts
      await this._load(userId)
      if (bucket === 'subscription') this.bal.subscription_vc += amount
      else this.bal.topup_vc += amount
      await this._persistAndLog('grant', amount, bucket, ref, reason, actor ?? 'system', expiresAt ?? null)
      return this.balance(userId)
    })
  }

  // Subscription renewal (order.paid, billing_reason=subscription_cycle): unspent
  // subscription credits do NOT roll over (§10.5 FR-C15) — expire the remainder, then
  // grant the new cycle. Top-up credits are untouched. Credits sitting inside open holds
  // were already deducted from the bucket, so an in-flight generation is never clawed back.
  grantCycle(userId, amount, opts = {}) {
    return this._locked(async () => {
      const { ref, reason } = opts
      await this._load(userId)
      const expired = this.bal.subscription_vc
      if (expired > 0) {
        this.bal.subscription_vc = 0
        await this._persistAndLog('expire', -expired, 'subscription', ref, 'cycle_reset')
      }
      this.bal.subscription_vc += amount
      await this._persistAndLog('grant', amount, 'subscription', ref, reason ?? 'subscription_cycle')
      return this.balance(userId)
    })
  }

  // Reserve `cost` credits. Spend order: subscription first, then top-up (§10.5 FR-C14).
  // Returns { ok:false } (→ caller responds 402) if the balance can't cover it (FR-C7).
  quoteAndHold(userId, cost, ref) {
    return this._locked(async () => {
      await this._load(userId)
      if (cost <= 0) return { ok: false, reason: 'invalid_cost' }
      if (this._total() < cost) return { ok: false, reason: 'insufficient', total: this._total(), cost }

      const fromSub = Math.min(this.bal.subscription_vc, cost)
      const fromTop = cost - fromSub

      const holdId = ulid()
      await this.ctx.storage.put(`hold:${holdId}`, {
        amount: cost, fromSub, fromTop, ref: ref ?? null, createdAt: Date.now(),
      })
      this.bal.subscription_vc -= fromSub
      this.bal.topup_vc -= fromTop
      try {
        await this._persistAndLog('hold', -cost, 'mixed', ref, 'hold')
      } catch (e) {
        // Roll the hold back so no phantom reservation survives a failed persist.
        await this.ctx.storage.delete(`hold:${holdId}`).catch(() => {})
        throw e
      }
      return { ok: true, holdId, cost }
    })
  }

  // Convert a hold to a spend on `completed` (§10.3 step 4).
  settle(userId, holdId, ref) {
    return this._locked(async () => {
      await this._load(userId)
      const hold = await this.ctx.storage.get(`hold:${holdId}`)
      if (!hold) return { ok: false, reason: 'unknown_hold' } // idempotent: already settled/released
      await this.ctx.storage.delete(`hold:${holdId}`)
      // Credits were already removed from the buckets at hold time; record the spend.
      try {
        await this._persistAndLog('spend', -hold.amount, 'mixed', ref ?? hold.ref, 'delivered')
      } catch (e) {
        // Restore the hold so the provider's webhook retry can settle it for real.
        await this.ctx.storage.put(`hold:${holdId}`, hold).catch(() => {})
        throw e
      }
      return { ok: true }
    })
  }

  // Release a hold on failed/nsfw/timeout/cancel — no charge (§10.3). Idempotent (FR-C6).
  release(userId, holdId, reason) {
    return this._locked(async () => {
      await this._load(userId)
      const hold = await this.ctx.storage.get(`hold:${holdId}`)
      if (!hold) return { ok: false, reason: 'unknown_hold' }
      await this.ctx.storage.delete(`hold:${holdId}`)
      this.bal.subscription_vc += hold.fromSub
      this.bal.topup_vc += hold.fromTop
      try {
        await this._persistAndLog('release', hold.amount, 'mixed', hold.ref, reason ?? 'released')
      } catch (e) {
        // Un-restore: put the hold back so a retry releases exactly once. (this.bal was
        // already invalidated by _persistAndLog, so no manual counter rollback needed.)
        await this.ctx.storage.put(`hold:${holdId}`, hold).catch(() => {})
        throw e
      }
      return { ok: true }
    })
  }

  // TODO(phase-2): expireDue() — sweep subscription credits at cycle end + top-up after 12mo.
}
