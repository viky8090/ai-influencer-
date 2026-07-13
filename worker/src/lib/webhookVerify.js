// Provider webhook signature verification (defense in depth).
// Primary safety is confirmFromProvider() re-polling with our API keys.
// When secrets/JWKS verification is available, reject forgeries early.

// ── fal.ai ED25519 (JWKS) ──────────────────────────────────────────────
// Docs: message = requestId\nuserId\ntimestamp\nsha256(body).hex
// Headers: X-Fal-Webhook-Request-Id, X-Fal-Webhook-User-Id,
//          X-Fal-Webhook-Timestamp, X-Fal-Webhook-Signature

const FAL_JWKS_URL = 'https://rest.fal.ai/.well-known/jwks.json'
const FAL_JWKS_TTL_MS = 6 * 60 * 60 * 1000 // 6h (docs allow ≤24h)
let falJwksCache = null
let falJwksAt = 0

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2) return null
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function fetchFalJwks() {
  const now = Date.now()
  if (falJwksCache && now - falJwksAt < FAL_JWKS_TTL_MS) return falJwksCache
  const res = await fetch(FAL_JWKS_URL, { cf: { cacheTtl: 3600 } })
  if (!res.ok) throw new Error(`jwks_${res.status}`)
  const data = await res.json()
  falJwksCache = data.keys || []
  falJwksAt = now
  return falJwksCache
}

/**
 * @returns {{ ok: true } | { ok: false, error: string, soft?: boolean }}
 * soft:true means headers missing — caller may still re-poll (legacy/misconfigured).
 * soft:false means headers present but invalid — reject hard.
 */
export async function verifyFalWebhook(rawBody, headers) {
  const requestId = headers['x-fal-webhook-request-id'] || headers['X-Fal-Webhook-Request-Id']
  const userId = headers['x-fal-webhook-user-id'] || headers['X-Fal-Webhook-User-Id']
  const timestamp = headers['x-fal-webhook-timestamp'] || headers['X-Fal-Webhook-Timestamp']
  const signatureHex = headers['x-fal-webhook-signature'] || headers['X-Fal-Webhook-Signature']

  // No signature headers: allow through only if we will re-poll (soft). Prevents total outage
  // if fal changes headers; confirmFromProvider still blocks forgery.
  if (!requestId || !userId || !timestamp || !signatureHex) {
    return { ok: false, error: 'missing_signature_headers', soft: true }
  }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return { ok: false, error: 'timestamp_skew', soft: false }
  }

  const bodyBytes = typeof rawBody === 'string' ? new TextEncoder().encode(rawBody) : rawBody
  const bodyHash = await sha256Hex(bodyBytes)
  const message = new TextEncoder().encode([requestId, userId, timestamp, bodyHash].join('\n'))
  const sig = hexToBytes(signatureHex)
  if (!sig) return { ok: false, error: 'bad_signature_format', soft: false }

  let keys
  try {
    keys = await fetchFalJwks()
  } catch {
    // JWKS unreachable — soft fail so re-poll path can still deliver legit jobs
    return { ok: false, error: 'jwks_unavailable', soft: true }
  }

  let verifyAttempts = 0
  let importFailures = 0
  for (const key of keys) {
    if (typeof key.x !== 'string') continue
    try {
      const pub = b64urlToBytes(key.x)
      const cryptoKey = await crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify'])
      verifyAttempts++
      const valid = await crypto.subtle.verify({ name: 'Ed25519' }, cryptoKey, sig, message)
      if (valid) return { ok: true }
    } catch {
      importFailures++
      continue
    }
  }
  // Runtime without Ed25519 — soft-fail so re-poll still delivers legit jobs
  if (importFailures > 0 && verifyAttempts === 0) {
    return { ok: false, error: 'ed25519_unavailable', soft: true }
  }
  return { ok: false, error: 'invalid_signature', soft: false }
}

// ── Higgsfield shared-secret HMAC ──────────────────────────────────────
// When HF_WEBHOOK_SECRET is set: require header X-Webhook-Secret or
// X-Higgsfield-Signature (hex HMAC-SHA256 of raw body) to match.
// When unset: soft (rely on re-poll).

export async function verifyHiggsfieldWebhook(env, rawBody, headers) {
  const secret = env.HF_WEBHOOK_SECRET
  if (!secret) return { ok: false, error: 'not_configured', soft: true }

  const simple = headers['x-webhook-secret'] || headers['X-Webhook-Secret']
  if (simple && timingSafeEqualStr(simple, secret)) return { ok: true }

  const sig =
    headers['x-higgsfield-signature'] ||
    headers['X-Higgsfield-Signature'] ||
    headers['x-signature'] ||
    headers['X-Signature'] ||
    ''
  if (!sig) return { ok: false, error: 'missing_signature', soft: false }

  const bodyBytes = typeof rawBody === 'string' ? new TextEncoder().encode(rawBody) : rawBody
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, bodyBytes)
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const provided = String(sig).replace(/^sha256=/i, '').trim()
  if (timingSafeEqualStr(hex, provided)) return { ok: true }
  // Also accept base64 forms
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
  if (timingSafeEqualStr(b64, provided)) return { ok: true }
  return { ok: false, error: 'invalid_signature', soft: false }
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
