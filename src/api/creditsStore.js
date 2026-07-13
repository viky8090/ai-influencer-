// Shared live credit balance — one fetch pipeline for CreditChip, ProfileMenu, Dashboard.
// Survives remounts, recovers from failed auth races, and revalidates on focus / generation.
// Robustness rules:
//   • One refresh loop total, no matter how many components call useCredits() (refcounted).
//   • A refresh in flight for too long is abandoned, never dedupe onto a dead promise.
//   • A failed refresh keeps the last-known number visible (stale), scoped per user.
//   • With no last-known to show, failures self-heal on a backoff timer — the "— cr"
//     state is always temporary.
import { useSyncExternalStore, useEffect } from 'react'
import { useAuth } from '@clerk/react'
import { api } from './client'

const LAST_KEY_PREFIX = 'vy_credits_last' // + ':<userId>' — never bleed across accounts
const POLL_MS = 25_000
const INFLIGHT_MAX_MS = 25_000 // apiFetch aborts at 20s; this is the safety net above it
const RETRY_BASE_MS = 2_000
const RETRY_MAX_MS = 15_000

let state = {
  bal: null,       // { total, subscription_vc, topup_vc, held } | null
  loading: true,
  err: false,
  stale: false,    // true when showing last-known after a failed refresh
  updatedAt: 0,
}

const listeners = new Set()
let inflight = null
let inflightAt = 0

function emit() {
  for (const fn of listeners) fn()
}

function lastKey() {
  return `${LAST_KEY_PREFIX}:${window.Clerk?.user?.id || 'anon'}`
}

function readLastKnown() {
  try {
    const raw = sessionStorage.getItem(lastKey())
    if (!raw) return null
    const b = JSON.parse(raw)
    if (b && typeof b === 'object' && Number.isFinite(Number(b.total))) {
      return normalize(b)
    }
  } catch { /* ignore */ }
  return null
}

function writeLastKnown(bal) {
  try { sessionStorage.setItem(lastKey(), JSON.stringify(bal)) } catch { /* quota */ }
}

function normalize(b) {
  const subscription_vc = Math.max(0, Math.round(Number(b?.subscription_vc) || 0))
  const topup_vc = Math.max(0, Math.round(Number(b?.topup_vc) || 0))
  const held = Math.max(0, Math.round(Number(b?.held) || 0))
  // Prefer server total; fall back to sum so UI never gets NaN/undefined.
  const total = Number.isFinite(Number(b?.total))
    ? Math.max(0, Math.round(Number(b.total)))
    : subscription_vc + topup_vc
  return { subscription_vc, topup_vc, total, held }
}

function setState(partial) {
  state = { ...state, ...partial }
  emit()
}

/** Force a network refresh of the balance. Dedupes concurrent callers. */
export async function refreshCredits({ force = true } = {}) {
  // Reuse an in-flight refresh — unless it has been pending suspiciously long
  // (a hung request must never freeze the pipeline; apiFetch also aborts at 20s).
  if (inflight && Date.now() - inflightAt < INFLIGHT_MAX_MS) return inflight

  // Keep showing last known while revalidating — never flash blank if we have data.
  if (!state.bal) {
    const last = readLastKnown()
    if (last) setState({ bal: last, loading: true, err: false, stale: true })
    else setState({ loading: true })
  }

  const p = (async () => {
    try {
      const raw = await api.credits({ force })
      const bal = normalize(raw)
      writeLastKnown(bal)
      clearErrRetry() // healthy again — reset the failure backoff
      setState({ bal, loading: false, err: false, stale: false, updatedAt: Date.now() })
      return bal
    } catch (e) {
      const last = state.bal || readLastKnown()
      if (last) {
        // Soft fail: keep previous number visible
        setState({ bal: last, loading: false, err: false, stale: true })
      } else {
        setState({ loading: false, err: true, stale: false })
        scheduleErrRetry(e)
      }
      throw e
    } finally {
      if (inflight === p) inflight = null
    }
  })()

  inflight = p
  inflightAt = Date.now()
  return p
}

// ── Error self-heal ────────────────────────────────────────────────────────────
// Only runs while the UI has nothing to show (err && bal == null). Backoff doubles
// 2s → 4s → 8s → 15s cap; a 401 (Clerk token lag right after sign-in) retries in 1s.
let retryTimer = null
let retryAttempt = 0

function scheduleErrRetry(e) {
  if (!loopUsers) return // nobody signed in / no consumers — don't spin
  if (retryTimer) return
  const delay = e?.status === 401
    ? 1_000
    : Math.min(RETRY_BASE_MS * 2 ** retryAttempt, RETRY_MAX_MS)
  retryAttempt++
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (!loopUsers || state.bal != null || !state.err) return
    refreshCredits({ force: true }).catch(() => {})
  }, delay)
}

function clearErrRetry() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  retryAttempt = 0
}

export function getCreditsSnapshot() {
  return state
}

export function subscribeCredits(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Notify all credit UIs to re-fetch (call after hold/settle/cancel/checkout). */
export function notifyCreditsChanged() {
  try { window.dispatchEvent(new CustomEvent('vymotion:credits')) } catch { /* ignore */ }
}

// ── The single shared refresh loop (refcounted across useCredits consumers) ────
let loopUsers = 0
let loopUserId = null
let loopCleanup = null

function onRefresh() {
  refreshCredits({ force: true }).catch(() => {})
}

function startLoop(userId) {
  loopUsers++
  if (loopCleanup && loopUserId === userId) return
  stopLoopListeners()
  loopUserId = userId

  let bootAlive = true
  async function boot() {
    // Clerk JWT can lag a beat after sign-in — retry with backoff. After this loop
    // the 25s poll + err-retry timers keep trying forever; boot just front-loads it.
    for (let attempt = 0; bootAlive && attempt < 10; attempt++) {
      try {
        await refreshCredits({ force: attempt > 0 })
        return
      } catch {
        await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** attempt, 4000)))
      }
    }
  }
  boot()

  function onVisible() {
    // Skip the fetch when the tab was hidden only briefly and data is still fresh.
    if (document.visibilityState !== 'visible') return
    if (Date.now() - state.updatedAt < POLL_MS && !state.err && !state.stale) return
    onRefresh()
  }
  function onPaywall(e) {
    // The 402 body carries the authoritative total — paint it instantly, but drop the
    // bucket breakdown (it's from the stale snapshot) and let the revalidate repaint it.
    const b = e.detail?.balance
    if (b != null && Number.isFinite(Number(b))) {
      const next = { ...normalize({ total: Number(b) }), held: state.bal?.held ?? 0 }
      writeLastKnown(next)
      setState({ bal: next, loading: false, err: false, stale: true })
    }
    onRefresh()
  }

  window.addEventListener('vymotion:credits', onRefresh)
  window.addEventListener('vymotion:paywall', onPaywall)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onRefresh)
  const poll = setInterval(onRefresh, POLL_MS)

  loopCleanup = () => {
    bootAlive = false
    window.removeEventListener('vymotion:credits', onRefresh)
    window.removeEventListener('vymotion:paywall', onPaywall)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onRefresh)
    clearInterval(poll)
  }
}

function stopLoopListeners() {
  if (loopCleanup) { loopCleanup(); loopCleanup = null }
  clearErrRetry()
}

function stopLoop() {
  loopUsers = Math.max(0, loopUsers - 1)
  if (loopUsers === 0) {
    stopLoopListeners()
    loopUserId = null
  }
}

/**
 * React hook — auto-starts the shared refresh loop while signed in.
 * Returns { total, bal, loading, err, stale, refresh }.
 */
export function useCredits() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const snap = useSyncExternalStore(subscribeCredits, getCreditsSnapshot, getCreditsSnapshot)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      // Signed out (or Clerk still booting): clear state so nothing stale ever renders.
      if (loopUsers === 0) setState({ bal: null, loading: false, err: false, stale: false, updatedAt: 0 })
      return undefined
    }
    if (loopUserId && loopUserId !== userId) {
      // Account switch: hard-reset state before the new user's loop starts.
      setState({ bal: null, loading: true, err: false, stale: false, updatedAt: 0 })
    }
    startLoop(userId)
    return stopLoop
  }, [isLoaded, isSignedIn, userId])

  const total = snap.bal?.total
  return {
    bal: snap.bal,
    total: total == null ? null : total,
    loading: snap.loading && snap.bal == null,
    err: snap.err && snap.bal == null,
    stale: snap.stale,
    refresh: () => refreshCredits({ force: true }),
  }
}
