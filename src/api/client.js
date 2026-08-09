// Authenticated client for the Vymotion API Worker.
// Attaches the Clerk session token; the Worker verifies it and scopes every call to the user.
// No API keys ever touch the browser — just the short-lived Clerk JWT.

const API_BASE = import.meta.env.VITE_API_URL || 'https://vymotion-api.vikranty301.workers.dev'

export class ApiError extends Error {
  constructor(status, code, body) {
    super(code || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }
}

async function getToken() {
  // clerk-js attaches window.Clerk once loaded; getToken() returns the short-lived session JWT.
  // Brief wait helps right after sign-in when session exists but token isn't ready yet.
  try {
    let token = (await window.Clerk?.session?.getToken?.()) || null
    if (token) return token
    if (window.Clerk?.session) {
      await new Promise((r) => setTimeout(r, 120))
      token = (await window.Clerk.session.getToken?.()) || null
    }
    return token
  } catch {
    return null
  }
}

// Every request gets an abort timeout so a stalled connection (network switch, sleeping
// laptop) can never leave a promise pending forever — pending promises upstream (creditsStore,
// cached()) dedupe on the in-flight promise, so one hung fetch used to freeze all refreshes.
const DEFAULT_TIMEOUT_MS = 20_000

export async function apiFetch(path, { method = 'GET', body, headers = {}, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const token = auth ? await getToken() : null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
  } catch (e) {
    throw new ApiError(0, ctrl.signal.aborted ? 'timeout' : 'network_error', { detail: String(e?.message || e) })
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error, data)
  return data
}

// ── Read cache — makes repeat navigation feel instant ─────────────────────────
// Small time-based cache for hot read endpoints (me / credits / plan) that several
// components request independently on every mount. Within the TTL the cached value resolves
// immediately (no network, no "…" flash); concurrent callers share one in-flight request.
// Entries persist to sessionStorage so a full page reload paints instantly too.
// Keys are scoped per Clerk user so a sign-out/sign-in never shows the previous user's data.
const CACHE_PREFIX = 'vy_cache:'
const INFLIGHT_MAX_MS = 25_000 // belt-and-braces: never dedupe onto a request older than this
const memCache = new Map() // key → { at, data }
const inflight = new Map() // key → { at, p }

function cacheKey(name) {
  return `${name}:${window.Clerk?.user?.id || 'anon'}`
}

function cached(name, ttlMs, fetcher) {
  const key = cacheKey(name)
  const now = Date.now()
  let hit = memCache.get(key)
  if (!hit) {
    try { hit = JSON.parse(sessionStorage.getItem(CACHE_PREFIX + key)) } catch { /* ignore */ }
  }
  if (hit && now - hit.at < ttlMs) {
    memCache.set(key, hit)
    return Promise.resolve(hit.data)
  }
  const ent = inflight.get(key)
  if (ent && now - ent.at < INFLIGHT_MAX_MS) return ent.p
  const p = fetcher()
    .then((data) => {
      const entry = { at: Date.now(), data }
      memCache.set(key, entry)
      try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry)) } catch { /* quota */ }
      return data
    })
    .finally(() => { if (inflight.get(key)?.p === p) inflight.delete(key) })
  inflight.set(key, { at: now, p })
  return p
}

// Drop cached reads after a mutation that changes them (hold placed, profile edit, checkout).
// Does not emit UI events — callers that need a live chip update should also dispatch
// `vymotion:credits` (see creditsStore.notifyCreditsChanged) or rely on poll/focus.
export function invalidateCache(...names) {
  for (const name of names) {
    const key = cacheKey(name)
    memCache.delete(key)
    inflight.delete(key)
    try { sessionStorage.removeItem(CACHE_PREFIX + key) } catch { /* ignore */ }
  }
}

// Endpoint helpers — grow as the API surface lands.
export const api = {
  me: () => cached('me', 60_000, () => apiFetch('/api/me')),
  updateMe: (patch) => { invalidateCache('me'); return apiFetch('/api/me', { method: 'PATCH', body: patch }) },
  // force:true bypasses the short TTL (used by creditsStore after gen / focus).
  credits: (opts = {}) => {
    if (opts?.force) invalidateCache('credits')
    // Short TTL — balance changes on every hold/settle; long cache caused blank/stale chips.
    return cached('credits', 5_000, () => apiFetch('/api/credits'))
  },
  ledger: (qs = '') => apiFetch(`/api/credits/ledger${qs}`),
  influencers: {
    list: () => apiFetch('/api/influencers'),
    saveAll: (influencers) => apiFetch('/api/influencers', { method: 'PUT', body: { influencers } }),
    remove: (id) => apiFetch(`/api/influencers/${id}`, { method: 'DELETE' }),
  },
  inspiration: {
    list: () => apiFetch('/api/inspiration').then((r) => r.boards),
    saveAll: (boards) => apiFetch('/api/inspiration', { method: 'PUT', body: { boards } }),
  },
  brandDeals: {
    list: () => apiFetch('/api/brand-deals').then((r) => r.deals),
    saveAll: (deals) => apiFetch('/api/brand-deals', { method: 'PUT', body: { deals } }),
  },
  photoHistory: {
    list: () => apiFetch('/api/photo-history').then((r) => r.items),
    saveAll: (items) => apiFetch('/api/photo-history', { method: 'PUT', body: { items } }),
  },
  uploads: {
    // Longer timeout: multi-MB data-URLs on slow uplinks legitimately exceed the default.
    create: (dataUrl) => apiFetch('/api/uploads', { method: 'POST', body: { dataUrl }, timeoutMs: 90_000 }), // → { id, url }
    rehost: (url) => apiFetch('/api/uploads', { method: 'POST', body: { url }, timeoutMs: 90_000 }), // remote CDN image → R2, → { id, url }
  },
  billing: {
    // key: starter|creator|pro|studio (interval 'month'|'year') or small|medium|large|mega packs.
    // credits: optional MONTHLY tier size for slider plans (600/900, 1800/2700/3600, 5500/8000/11000).
    // checkout drops the cached plan+credits so the post-purchase return paints fresh numbers.
    checkout: (key, interval, credits) => {
      invalidateCache('plan', 'credits')
      try { window.dispatchEvent(new CustomEvent('vymotion:credits')) } catch { /* ignore */ }
      return apiFetch('/api/billing/checkout', { method: 'POST', body: { key, interval, ...(credits ? { credits } : {}) } })
    },
    portal: () => apiFetch('/api/billing/portal', { method: 'POST' }), // → { url } (Polar customer portal)
    plan: () => cached('plan', 60_000, () => apiFetch('/api/billing/plan')), // → { plan, subscription, configured }
  },
  social: {
    // Postiz-backed publishing (paid plans). Worker enforces plan + channel ownership.
    channels: () => apiFetch('/api/social/channels'), // → { channels, connectable }
    connect: (platform) => apiFetch('/api/social/channels/connect', { method: 'POST', body: { platform } }), // → { url, pending_id }
    claim: (pendingId) => apiFetch('/api/social/channels/claim', { method: 'POST', body: { pending_id: pendingId } }), // → { channel } | { pending: true }
    disconnect: (id) => apiFetch(`/api/social/channels/${id}`, { method: 'DELETE' }),
    channelSettings: (id) => apiFetch(`/api/social/channels/${id}/settings`),
    createPost: (post) => apiFetch('/api/social/posts', { method: 'POST', body: post }), // → { post }
    listPosts: (from, to) => apiFetch(`/api/social/posts?from=${from}&to=${to}`), // → { posts }
    updatePost: (id, status) => apiFetch(`/api/social/posts/${id}`, { method: 'PATCH', body: { status } }),
    deletePost: (id) => apiFetch(`/api/social/posts/${id}`, { method: 'DELETE' }),
  },
  generate: {
    // { kind:'image'|'video'|'prompt'|..., model, params, count, influencerId }
    // submit places a credit hold and cancel releases it — both drop the cached balance.
    submit: (req) => {
      invalidateCache('credits')
      // Long timeout: kind='prompt' runs the Anthropic call inline server-side (vision char
      // sheets can take a minute); image/video submits return fast but share the path.
      return apiFetch('/api/generate', { method: 'POST', body: req, timeoutMs: 120_000 }).finally(() => {
        try { window.dispatchEvent(new CustomEvent('vymotion:credits')) } catch { /* ignore */ }
      })
    },
    status: (id) => apiFetch(`/api/generations/${id}`),
    list: (qs = '') => apiFetch(`/api/generations${qs}`),
    cancel: (id) => {
      invalidateCache('credits')
      return apiFetch(`/api/generations/${id}/cancel`, { method: 'POST' }).finally(() => {
        try { window.dispatchEvent(new CustomEvent('vymotion:credits')) } catch { /* ignore */ }
      })
    },
    assetUrl: (assetId) => `${API_BASE}/api/assets/${assetId}`, // needs Authorization header to fetch
  },
}
