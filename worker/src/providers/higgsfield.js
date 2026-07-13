// Higgsfield Platform REST adapter (PRD Appendix A). Server-side only — key/secret live in
// Workers Secrets. Base: https://platform.higgsfield.ai · Auth: `Authorization: Key {key}:{secret}`.
// Model paths + params verified against the live OpenAPI spec (docs.higgsfield.ai/docs/openapi.json).
const BASE = 'https://platform.higgsfield.ai'

export class HiggsfieldError extends Error {
  constructor(status, body) {
    super(`Higgsfield ${status}: ${body}`)
    this.name = 'HiggsfieldError'
    this.status = status
    this.body = body
  }
}

function authHeader(env) {
  return `Key ${env.HF_API_KEY}:${env.HF_API_SECRET}`
}

// Model availability on THIS account (verified via cloud.higgsfield.ai gallery + live probes):
// soul family + popcorn/auto + DoP video are provisioned; nano-banana / gpt-image are NOT (404).
// popcorn/auto takes `image_urls[]` → the multi-reference model matching the app's @image_1..4
// character-consistency workflow. References are passed as URLs, not upload handles.
function mapImageRes(r) { return String(r || '').toLowerCase().includes('4') ? '4K' : '2K' }
// popcorn/auto: resolution enum ["720p","1600p"]; aspect enum lacks 4:5/5:4/21:9 → map to nearest.
function mapPopcornRes(r) {
  const s = String(r || '').toLowerCase()
  return (s.includes('4') || s.includes('2k') || s.includes('16')) ? '1600p' : '720p'
}
const POPCORN_ASPECTS = new Set(['1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16'])
function mapPopcornAspect(a) {
  if (POPCORN_ASPECTS.has(a)) return a
  if (a === '4:5') return '3:4'   // nearest portrait
  if (a === '5:4') return '4:3'
  if (a === '21:9') return '16:9'
  return '9:16'
}
// App model + generic params → { path, body } for the Platform API. Returns null for unknown models.
export function buildRequest(model, p = {}) {
  const prompt = p.prompt || p.text || ''
  const aspect = p.aspect_ratio || p.aspectRatio || '9:16'
  const count = p.count || p.num_images || 1
  const refs = (p.references || p.input_images || []).filter(Boolean)

  switch (model) {
    case 'soul_2':
      if (refs[0]) {
        return { path: 'higgsfield-ai/soul/reference', body: { prompt, image_reference_url: refs[0], aspect_ratio: aspect, resolution: '1080p', batch_size: 1 } }
      }
      return { path: 'higgsfield-ai/soul/standard', body: { prompt, num_images: count, aspect_ratio: aspect, resolution: mapImageRes(p.resolution) } }

    // LEGACY FALLBACK ONLY — the registry now routes gpt/nano strictly to fal.ai (the selected
    // model must be the model that runs). These cases stay so an emergency registry change can
    // re-point at HF popcorn/auto without touching this adapter, but are normally unreachable.
    case 'gpt_image_2':
    case 'nano_banana_2':
    case 'nano_banana_flash':
      if (refs.length) {
        return { path: 'higgsfield-ai/popcorn/auto', body: { prompt, image_urls: refs, num_images: count, aspect_ratio: mapPopcornAspect(aspect), resolution: mapPopcornRes(p.resolution) } }
      }
      return { path: 'higgsfield-ai/soul/standard', body: { prompt, num_images: count, aspect_ratio: aspect, resolution: mapImageRes(p.resolution) } }

    default:
      return null
  }
}

// Submit a generation. `path` e.g. 'higgsfield-ai/soul/standard'. Returns the provider payload
// incl. `request_id`. Pass `webhookUrl` to register the async callback.
export async function submit(env, path, body, webhookUrl) {
  const url = new URL(`${BASE}/${path}`)
  if (webhookUrl) url.searchParams.set('hf_webhook', webhookUrl)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new HiggsfieldError(res.status, await res.text().catch(() => ''))
  return res.json()
  // TODO(phase-3): port 429/5xx retry+backoff from the old client into the caller.
}

export async function status(env, requestId) {
  const res = await fetch(`${BASE}/requests/${requestId}/status`, { headers: { Authorization: authHeader(env) } })
  if (!res.ok) throw new HiggsfieldError(res.status, await res.text().catch(() => ''))
  return res.json()
}

export async function cancel(env, requestId) {
  const res = await fetch(`${BASE}/requests/${requestId}/cancel`, { method: 'POST', headers: { Authorization: authHeader(env) } })
  return res.ok
}

export const TERMINAL = ['completed', 'failed', 'nsfw', 'cancelled']

// `failed` and `nsfw` are auto-refunded by Higgsfield and must never be charged (§10.3).
export function isRefundable(s) {
  return s === 'failed' || s === 'nsfw'
}
