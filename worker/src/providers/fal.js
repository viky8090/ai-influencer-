// fal.ai queue adapter (PRD §12.7) — fallback provider for models the Higgsfield account
// doesn't provision: the real nano-banana family and Seedance video. Server-side only;
// FAL_API_KEY lives in Workers Secrets.
// Queue API: POST https://queue.fal.run/{model_path} → { request_id, status_url, response_url,
// cancel_url }; async completion via ?fal_webhook=. Status/result/cancel REST paths use only the
// model path's FIRST TWO segments (fal's queue routing rule for nested model ids).
const BASE = 'https://queue.fal.run'

export class FalError extends Error {
  constructor(status, body) {
    super(`fal ${status}: ${body}`)
    this.name = 'FalError'
    this.status = status
    this.body = body
  }
}

function authHeader(env) {
  return `Key ${env.FAL_API_KEY}`
}

// Seedance lite aspect enum lacks 4:5/5:4 → map to nearest; nano-banana accepts the app's full set.
const SEEDANCE_ASPECTS = new Set(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'])
function mapSeedanceAspect(a) {
  if (SEEDANCE_ASPECTS.has(a)) return a
  if (a === '4:5') return '3:4'
  if (a === '5:4') return '4:3'
  return '9:16'
}
function mapSeedanceRes(r) {
  const s = String(r || '').toLowerCase()
  if (s.includes('1080')) return '1080p'
  if (s.includes('480')) return '480p'
  return '720p'
}
// nano-banana-pro resolution enum: 1K | 2K | 4K
function mapBananaProRes(r) {
  const s = String(r || '').toLowerCase()
  if (s.includes('4')) return '4K'
  if (s.includes('2')) return '2K'
  return '1K'
}
// Standard fal image_size preset enum (flux family, gpt-image-2) from the app's aspect set.
function mapFluxImageSize(aspect) {
  const [w, h] = String(aspect || '9:16').split(':').map(Number)
  if (!w || !h || w === h) return 'square_hd'
  const r = w / h
  if (r > 1) return r >= 1.5 ? 'landscape_16_9' : 'landscape_4_3'
  return r <= 0.67 ? 'portrait_16_9' : 'portrait_4_3'
}
// Seedream 4 takes explicit pixel dims (1024–4096 per side) — scale the aspect to a ~2K long side.
function mapSeedreamSize(aspect) {
  const [w, h] = String(aspect || '9:16').split(':').map(Number)
  if (!w || !h) return { width: 1152, height: 2048 }
  const scale = 2048 / Math.max(w, h)
  const rnd = (n) => Math.max(1024, Math.min(4096, Math.round((n * scale) / 32) * 32))
  return { width: rnd(w), height: rnd(h) }
}
// Kling t2v takes 16:9 | 9:16 | 1:1 — snap to nearest.
function mapSimpleAspect(a) {
  const [w, h] = String(a || '9:16').split(':').map(Number)
  if (!w || !h || w === h) return '1:1'
  return w > h ? '16:9' : '9:16'
}
// Veo 3 / Sora 2 t2v only take 16:9 | 9:16 (no 1:1 — verified via OpenAPI): square → portrait.
function mapWideTallAspect(a) {
  const [w, h] = String(a || '9:16').split(':').map(Number)
  return w > h ? '16:9' : '9:16'
}

// Seconds each video model will ACTUALLY render for a requested duration (mirrors the
// per-model snapping/clamping in buildRequest below) — used by the billing quote so users
// are never charged for seconds the model won't produce.
export function billableSeconds(model, p = {}) {
  const d = Math.round(p.duration || 5)
  switch (model) {
    case 'seedance_2_0':  return Math.min(Math.max(d, 4), 15)
    case 'seedance_lite': return Math.min(Math.max(d, 2), 12)
    case 'seedance_pro':  return Math.min(Math.max(d, 3), 12)
    case 'kling_2_5_pro': return d > 7 ? 10 : 5
    case 'sora_2':        return d <= 6 ? 4 : d <= 10 ? 8 : 12
    case 'veo_3_fast':    return 8
    default:              return d
  }
}

// App model + generic params → { path, body } for the fal queue. Returns null for unknown models.
export function buildRequest(model, p = {}) {
  const prompt = p.prompt || p.text || ''
  const aspect = p.aspect_ratio || p.aspectRatio || '9:16'
  const count = p.count || p.num_images || 1
  const refs = (p.references || p.input_images || []).filter(Boolean)

  switch (model) {
    // OpenAI GPT Image 2 (probe-verified openai/gpt-image-2[/edit]) — /edit takes image_urls
    // (multi-ref) for character consistency; image_size uses the standard fal preset enum.
    case 'gpt_image_2': {
      // Default medium — high is ~3–4× COGS on fal; price book charges 22 VC for high.
      const q = String(p.quality || 'medium').toLowerCase()
      const quality = q === 'high' || q === 'low' ? q : 'medium'
      if (refs.length) {
        return { path: 'openai/gpt-image-2/edit', body: { prompt, image_urls: refs, num_images: count, image_size: mapFluxImageSize(aspect), quality, output_format: 'jpeg' } }
      }
      return { path: 'openai/gpt-image-2', body: { prompt, num_images: count, image_size: mapFluxImageSize(aspect), quality, output_format: 'jpeg' } }
    }

    case 'nano_banana_flash':
      if (refs.length) {
        return { path: 'fal-ai/nano-banana/edit', body: { prompt, image_urls: refs, num_images: count, aspect_ratio: aspect, output_format: 'jpeg' } }
      }
      return { path: 'fal-ai/nano-banana', body: { prompt, num_images: count, aspect_ratio: aspect, output_format: 'jpeg' } }

    case 'nano_banana_2':
      if (refs.length) {
        return { path: 'fal-ai/nano-banana-pro/edit', body: { prompt, image_urls: refs, num_images: count, aspect_ratio: aspect, resolution: mapBananaProRes(p.resolution), output_format: 'jpeg' } }
      }
      return { path: 'fal-ai/nano-banana-pro', body: { prompt, num_images: count, aspect_ratio: aspect, resolution: mapBananaProRes(p.resolution), output_format: 'jpeg' } }

    // ByteDance Seedream 4 — flagship image model; /edit takes image_urls (multi-ref on fal).
    case 'seedream_4': {
      const body = { prompt, num_images: count, image_size: mapSeedreamSize(aspect) }
      if (refs.length) {
        return { path: 'fal-ai/bytedance/seedream/v4/edit', body: { ...body, image_urls: refs } }
      }
      return { path: 'fal-ai/bytedance/seedream/v4/text-to-image', body }
    }

    // FLUX.1 Krea — opinionated photographic aesthetic; text-to-image only (no ref support).
    case 'flux_krea':
      return { path: 'fal-ai/flux-1/krea', body: { prompt, num_images: count, image_size: mapFluxImageSize(aspect), output_format: 'jpeg' } }

    // REAL Seedance 2.0 (probe-verified bytedance/seedance-2.0/*) — native audio, up to 15s,
    // up to 4k. duration string enum "4".."15" | "auto"; aspect enum matches the lite set + auto.
    case 'seedance_2_0': {
      const start = p.startFrameUrl || p.image_url
      const duration = String(Math.min(Math.max(Math.round(p.duration || 5), 4), 15))
      const res = String(p.resolution || '').toLowerCase()
      const body = { prompt, resolution: res.includes('4k') ? '4k' : mapSeedanceRes(p.resolution), duration, generate_audio: true }
      if (start) {
        // image-to-video: aspect_ratio defaults to 'auto' (derived from the start frame).
        return { path: 'bytedance/seedance-2.0/image-to-video', body: { ...body, image_url: start } }
      }
      return { path: 'bytedance/seedance-2.0/text-to-video', body: { ...body, aspect_ratio: mapSeedanceAspect(aspect) } }
    }

    // Seedance 1.0 Lite — the budget tier (the pre-2.0 default this app launched with).
    case 'seedance_lite': {
      const start = p.startFrameUrl || p.image_url
      // duration is a string enum "2".."12" (verified via the endpoint's OpenAPI spec).
      const duration = String(Math.min(Math.max(Math.round(p.duration || 5), 2), 12))
      const body = { prompt, resolution: mapSeedanceRes(p.resolution), duration }
      if (start) {
        return { path: 'fal-ai/bytedance/seedance/v1/lite/image-to-video', body: { ...body, image_url: start } }
      }
      return { path: 'fal-ai/bytedance/seedance/v1/lite/text-to-video', body: { ...body, aspect_ratio: mapSeedanceAspect(aspect) } }
    }

    // Seedance 1.0 Pro — same param shape as lite, higher fidelity tier.
    case 'seedance_pro': {
      const start = p.startFrameUrl || p.image_url
      const duration = String(Math.min(Math.max(Math.round(p.duration || 5), 3), 12))
      const body = { prompt, resolution: mapSeedanceRes(p.resolution), duration }
      if (start) {
        return { path: 'fal-ai/bytedance/seedance/v1/pro/image-to-video', body: { ...body, image_url: start } }
      }
      return { path: 'fal-ai/bytedance/seedance/v1/pro/text-to-video', body: { ...body, aspect_ratio: mapSeedanceAspect(aspect) } }
    }

    // Kling 2.5 Turbo Pro — cinematic motion; duration is a "5" | "10" enum, i2v derives aspect
    // from the start frame.
    case 'kling_2_5_pro': {
      const start = p.startFrameUrl || p.image_url
      const duration = (p.duration || 5) > 7 ? '10' : '5'
      if (start) {
        return { path: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', body: { prompt, image_url: start, duration } }
      }
      return { path: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', body: { prompt, duration, aspect_ratio: mapSimpleAspect(aspect) } }
    }

    // Google Veo 3 Fast — fixed 8s clips with native audio; resolution 720p | 1080p.
    case 'veo_3_fast': {
      const start = p.startFrameUrl || p.image_url
      const body = {
        prompt,
        duration: '8s',
        generate_audio: true,
        resolution: String(p.resolution || '').includes('1080') ? '1080p' : '720p',
      }
      if (start) {
        // i2v aspect_ratio defaults to 'auto' (derived from the start frame).
        return { path: 'fal-ai/veo3/fast/image-to-video', body: { ...body, image_url: start } }
      }
      return { path: 'fal-ai/veo3/fast', body: { ...body, aspect_ratio: mapWideTallAspect(aspect) } }
    }

    // OpenAI Sora 2 — duration is an INTEGER enum 4|8|12|16|20 (verified via OpenAPI);
    // t2v aspect only 9:16|16:9; base tier is 720p.
    case 'sora_2': {
      const start = p.startFrameUrl || p.image_url
      const d = p.duration || 5
      const duration = d <= 6 ? 4 : d <= 10 ? 8 : 12
      const body = { prompt, duration, resolution: '720p' }
      if (start) {
        // i2v aspect_ratio/resolution default to 'auto' (derived from the start frame).
        return { path: 'fal-ai/sora-2/image-to-video', body: { prompt, duration, image_url: start } }
      }
      return { path: 'fal-ai/sora-2/text-to-video', body: { ...body, aspect_ratio: mapWideTallAspect(aspect) } }
    }

    default:
      return null
  }
}

// Queue REST base for a nested model path — only the first two segments route the queue
// (e.g. 'fal-ai/bytedance/seedance/v1/lite/text-to-video' → 'fal-ai/bytedance').
export function queueBase(path) {
  return path.split('/').slice(0, 2).join('/')
}

export async function submit(env, path, body, webhookUrl) {
  const url = new URL(`${BASE}/${path}`)
  if (webhookUrl) url.searchParams.set('fal_webhook', webhookUrl)
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader(env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new FalError(res.status, await res.text().catch(() => ''))
  return res.json() // { request_id, status_url, response_url, cancel_url }
}

export async function status(env, path, requestId) {
  const res = await fetch(`${BASE}/${queueBase(path)}/requests/${requestId}/status`, {
    headers: { Authorization: authHeader(env) },
  })
  if (!res.ok) throw new FalError(res.status, await res.text().catch(() => ''))
  return res.json() // { status: 'IN_QUEUE'|'IN_PROGRESS'|'COMPLETED', ... }
}

// Full model output (only valid once status is COMPLETED): { images:[{url}] } | { video:{url} }.
export async function result(env, path, requestId) {
  const res = await fetch(`${BASE}/${queueBase(path)}/requests/${requestId}`, {
    headers: { Authorization: authHeader(env) },
  })
  if (!res.ok) throw new FalError(res.status, await res.text().catch(() => ''))
  return res.json()
}

export async function cancel(env, path, requestId) {
  const res = await fetch(`${BASE}/${queueBase(path)}/requests/${requestId}/cancel`, {
    method: 'PUT',
    headers: { Authorization: authHeader(env) },
  })
  return res.ok
}
