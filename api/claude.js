import { rateLimit, clientIp } from '../lib/rateLimit.js'

// Legacy BYO Anthropic key proxy (signed-out / offline path only).
// Platform-funded prompts use the Worker + server key instead.
// Hardening: origin allowlist + production blocks non-browser (no Origin) abuse.

const ALLOWED_ORIGINS = new Set([
  'https://vymotion.org',
  'https://www.vymotion.org',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
])

function corsOrigin(req) {
  const o = req.headers.origin || req.headers.Origin || ''
  if (ALLOWED_ORIGINS.has(o)) return o
  // Local vite / preview on other ports
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)) return o
  return null
}

export default async function handler(req, res) {
  // Kill switch for production if only Worker path is used
  if (process.env.CLAUDE_PROXY_DISABLED === '1' || process.env.CLAUDE_PROXY_DISABLED === 'true') {
    return res.status(410).json({ error: { message: 'Legacy Claude proxy disabled — sign in to use AI assist.' } })
  }

  const origin = corsOrigin(req)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version, anthropic-beta')
  }

  if (req.method === 'OPTIONS') {
    if (!origin) return res.status(403).end()
    return res.status(200).end()
  }
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  // Browser SPA always sends Origin. Block bare curl/scripting against this open proxy in prod.
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  if (isProd && !origin) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }
  if (!origin && !isProd) {
    // Dev tools / Postman on localhost without Origin — allow only non-prod
  } else if (!origin) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }

  const rl = rateLimit(clientIp(req.headers))
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter))
    return res.status(429).json({ error: { message: 'Too many requests — slow down a moment and try again.' } })
  }

  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(400).json({ error: { message: 'Missing x-api-key header' } })

  // Cap body size roughly (Vercel already limits; belt-and-suspenders)
  try {
    const rawLen = JSON.stringify(req.body || {}).length
    if (rawLen > 1_500_000) return res.status(413).json({ error: { message: 'Payload too large' } })
  } catch { /* ignore */ }

  try {
    const upstreamHeaders = {
      'x-api-key': apiKey,
      'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
      'content-type': 'application/json',
    }
    if (req.headers['anthropic-beta']) upstreamHeaders['anthropic-beta'] = req.headers['anthropic-beta']

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: { message: e.message } })
  }
}
