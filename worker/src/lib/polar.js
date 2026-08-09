// Polar.sh API client + webhook verification (PRD §11).
// Polar is the Merchant of Record: hosted checkout + customer portal + webhooks.
// Env: POLAR_ACCESS_TOKEN (secret), POLAR_WEBHOOK_SECRET (secret),
//      POLAR_API_BASE (var: https://sandbox-api.polar.sh | https://api.polar.sh).

const DEFAULT_BASE = 'https://sandbox-api.polar.sh'

export class PolarError extends Error {
  constructor(status, detail) {
    super(`Polar ${status}: ${detail}`)
    this.name = 'PolarError'
    this.status = status
  }
}

export function isPolarConfigured(env) {
  return Boolean(env.POLAR_ACCESS_TOKEN)
}

async function polarFetch(env, path, { method = 'GET', body } = {}) {
  const base = env.POLAR_API_BASE || DEFAULT_BASE
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const detail = data ? JSON.stringify(data.detail ?? data.error ?? data) : text
    throw new PolarError(res.status, String(detail).slice(0, 400))
  }
  return data
}

// Hosted checkout session for one product (plan or pack). `external_customer_id` ties the
// Polar customer to our user id so webhooks can resolve the account without guesswork.
export function createCheckout(env, { productId, userId, email, successUrl }) {
  return polarFetch(env, '/v1/checkouts/', {
    method: 'POST',
    body: {
      products: [productId],
      external_customer_id: userId,
      customer_email: email || undefined,
      success_url: successUrl,
      metadata: { user_id: userId },
    },
  })
}

// Customer portal session (plan changes, payment methods, invoices — FR-B9).
// 404s if this user never checked out on Polar.
export function createPortalSession(env, userId) {
  return polarFetch(env, '/v1/customer-sessions/', {
    method: 'POST',
    body: { external_customer_id: userId },
  })
}

// ── Webhook verification — Standard Webhooks spec ──────────────────────
// signature = base64(HMAC-SHA256(key, `${webhook-id}.${webhook-timestamp}.${raw}`)).
// Key-derivation gotcha: Polar's SDK base64-wraps the ENTIRE secret string (including its
// `whsec_` prefix) before handing it to the standardwebhooks lib — so Polar signs with the
// UTF-8 bytes of the secret as displayed. Svix-style secrets instead base64-DECODE the part
// after `whsec_`. We accept a match under any of the three derivations; an attacker still
// needs the actual secret, so this costs nothing in security.
export async function verifyPolarWebhook(env, raw, headers) {
  const secret = env.POLAR_WEBHOOK_SECRET
  if (!secret) return { ok: false, error: 'not_configured' }

  const id = headers['webhook-id']
  const ts = headers['webhook-timestamp']
  const sigHeader = headers['webhook-signature']
  if (!id || !ts || !sigHeader) return { ok: false, error: 'missing_headers' }

  const skew = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(skew) || skew > 300) return { ok: false, error: 'timestamp_out_of_tolerance' }

  const enc = new TextEncoder()
  const candidates = [enc.encode(secret)] // full string as raw bytes (Polar's convention)
  if (secret.startsWith('whsec_')) {
    const rest = secret.slice(6)
    candidates.push(enc.encode(rest))
    try {
      const padded = rest + '='.repeat((4 - (rest.length % 4)) % 4)
      candidates.push(Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0)))
    } catch { /* not valid base64 — skip the Svix-style derivation */ }
  }

  const msg = enc.encode(`${id}.${ts}.${raw}`)
  const expectedSigs = []
  for (const keyBytes of candidates) {
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = await crypto.subtle.sign('HMAC', key, msg)
    expectedSigs.push(btoa(String.fromCharCode(...new Uint8Array(mac))))
  }

  // Header may carry several space-separated `v1,<base64>` entries (key rotation).
  for (const part of sigHeader.split(' ')) {
    const comma = part.indexOf(',')
    if (comma === -1) continue
    if (part.slice(0, comma) !== 'v1') continue
    const given = part.slice(comma + 1)
    if (expectedSigs.some((expected) => timingSafeEqual(given, expected))) return { ok: true, id }
  }
  return { ok: false, error: 'signature_mismatch' }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
