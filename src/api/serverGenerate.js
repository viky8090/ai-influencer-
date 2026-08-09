// Server-side generation adapter (Phase 3 cutover). Wraps POST /api/generate + status polling
// in the same submit→progress→results shape the pages use with the old client-side generators
// (utils/higgsfieldGenerate.js). Credits are metered server-side; no Higgsfield OAuth needed.
import { api } from './client'
import { notifyCreditsChanged } from './creditsStore'

const POLL_MS = 3000
const MAX_POLLS = 300 // ~15 min ceiling — 4K popcorn runs have taken 7½ min; videos can be slower
const API_BASE = import.meta.env.VITE_API_URL || 'https://vymotion-api.vikranty301.workers.dev'

// True when the user is signed in to Vymotion — the gate for routing generation server-side.
export function isVymotionSession() {
  return !!window.Clerk?.session
}

// Generation requires a Vymotion account (FR-A2/FR-S1) — open Clerk's sign-up modal in place
// instead of navigating away or blocking with an alert.
export function promptSignUp() {
  window.Clerk?.openSignUp?.()
}

// Plain, persistent, embeddable URL for a generated asset (unlisted ULID; see worker publicAssets).
export function publicAssetUrl(assetId) {
  return `${API_BASE}/public/assets/${assetId}`
}

// Cloudflare Image Resizing thumbnail. GATED by TRANSFORMATIONS_ENABLED: the zone's
// Transformations feature (Cloudflare dash → Images → Transformations → enable for
// vymotion.org) must be ON, otherwise /cdn-cgi/image/ 404s and every gated <img> breaks.
// Flip this to true ONLY after confirming a /cdn-cgi/image/ request returns 200.
// Even when true it no-ops on localhost and for non-public URLs (data:, blob:, localStorage
// refs), so it's safe to call unconditionally.
const TRANSFORMATIONS_ENABLED = true // verified live 2026-07-14: cf-resized 200, webp, 22x smaller

const _IS_CF_ZONE = typeof window !== 'undefined' &&
  (window.location.hostname === 'vymotion.org' || window.location.hostname === 'www.vymotion.org')

export function thumbUrl(url, width = 600) {
  if (!TRANSFORMATIONS_ENABLED || !_IS_CF_ZONE || typeof url !== 'string') return url
  if (!url.includes('/public/assets/') && !url.includes('/public/refs/')) return url
  return `/cdn-cgi/image/width=${width},format=auto,quality=85/${url}`
}

// R2 assets are private (header-auth), so <img>/<video> tags can't load them directly.
// Fetch with the Clerk token and hand back an object URL. Callers may revoke when done.
export async function fetchAssetBlobUrl(assetId) {
  const token = await window.Clerk?.session?.getToken?.()
  const res = await fetch(`${API_BASE}/api/assets/${assetId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`asset fetch failed (${res.status})`)
  return URL.createObjectURL(await res.blob())
}

// Popcorn rejects large reference images ("input_image_to_large"), so every ref is
// canvas-downscaled to a ≤1024px JPEG before upload — identity refs don't need more.
const MAX_REF_DIM = 1024
const REF_JPEG_QUALITY = 0.85

// Turn the app's mixed reference inputs (local data-URLs, /public paths, CDN URLs) into URLs
// Higgsfield can fetch. All paths converge on downscale→upload-to-R2; remote CDN images that
// block CORS are first re-hosted by the Worker (POST /api/uploads {url}) whose /public/refs
// copies send Access-Control-Allow-Origin so the canvas isn't tainted.
const refCache = new Map() // original ref string → resolved provider-fetchable URL

export async function resolveRefUrls(refs = []) {
  const out = []
  for (const ref of refs.filter(Boolean)) {
    if (typeof ref !== 'string') continue
    if (refCache.has(ref)) { out.push(refCache.get(ref)); continue }
    const url = await resolveOneRef(ref).catch(() => null)
    if (url) {
      refCache.set(ref, url)
      out.push(url)
    }
  }
  return out
}

async function resolveOneRef(ref) {
  if (ref.startsWith('data:image/')) {
    const blob = await (await fetch(ref)).blob()
    return uploadDownscaled(blob)
  }
  if (/^https?:\/\//.test(ref)) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(ref)) return uploadFromUrl(ref)
    // Remote image (Higgsfield CDN / CloudFront / our own /public/assets): fetch → downscale.
    const direct = await uploadFromUrl(ref)
    if (direct) return direct
    // CORS-blocked: Worker re-hosts it into R2, then the ACAO-enabled copy is fetchable.
    try {
      const { url: hosted } = await api.uploads.rehost(ref)
      const small = await uploadFromUrl(hosted)
      if (!small) console.warn('[vymotion] ref downscale failed after re-host — passing full-size:', ref)
      return small || hosted
    } catch (e) {
      console.warn('[vymotion] ref re-host failed — passing original URL:', ref, e?.message)
      return ref // last resort — pass the original through and let the provider try
    }
  }
  // Site-relative (seed images like /camila/main.jpg) — the app origin is localhost during
  // dev, so fetch in-browser, downscale, and upload to R2.
  if (ref.startsWith('/')) return uploadFromUrl(ref)
  return null
}

async function uploadFromUrl(src) {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return null
    return await uploadDownscaled(blob)
  } catch (e) {
    console.warn('[vymotion] ref fetch/upload failed:', src.slice(0, 80), e?.name, e?.message)
    return null
  }
}

async function uploadDownscaled(blob) {
  let dataUrl
  try {
    dataUrl = await downscaleToJpegDataUrl(blob)
  } catch (e) {
    console.warn('[vymotion] ref downscale failed:', e?.name, e?.message)
    // Undecodable in-browser — upload untouched only if it's small enough for the Worker's
    // 12MB cap AND the provider's input limits; otherwise this ref can't be salvaged here.
    if (blob.size > 8 * 1024 * 1024) throw new Error('ref image undecodable and too large to upload raw')
    dataUrl = await blobToDataUrl(blob)
  }
  const { url } = await api.uploads.create(dataUrl)
  return url
}

async function downscaleToJpegDataUrl(blob, maxDim = MAX_REF_DIM) {
  const img = await decodeImage(blob)
  const wSrc = img.width || img.naturalWidth
  const hSrc = img.height || img.naturalHeight
  const scale = Math.min(1, maxDim / Math.max(wSrc, hSrc))
  const w = Math.max(1, Math.round(wSrc * scale))
  const h = Math.max(1, Math.round(hSrc * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // JPEG has no alpha — flatten transparent PNGs onto white
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  img.close?.()
  if (img.dataset?.objectUrl) URL.revokeObjectURL(img.dataset.objectUrl)
  return canvas.toDataURL('image/jpeg', REF_JPEG_QUALITY)
}

// createImageBitmap chokes on some large/exotic images in some browsers — fall back to <img>.
async function decodeImage(blob) {
  try {
    return await createImageBitmap(blob)
  } catch (e) {
    console.warn('[vymotion] createImageBitmap failed, using <img> fallback:', e?.name, e?.message)
    const objectUrl = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = 'async'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = () => reject(new Error('image decode failed'))
        img.src = objectUrl
      })
      img.dataset.objectUrl = objectUrl
      return img
    } catch (err) {
      URL.revokeObjectURL(objectUrl)
      throw err
    }
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(blob)
  })
}

// Seamlessness rule: raw provider errors ("Higgsfield 400: …", "fal 422: …") never reach the
// user — they stay in the D1 error column + console. Pages only ever see friendly copy.
const CREDITS_MSG = 'Not enough Vymotion credits — top up or upgrade your plan to continue.'

// Submit one generation and poll to a terminal state.
// Returns { generationId, cost, status, assets:[{id, blobUrl?}], text? }.
// Throws Error with .status=402 when the balance can't cover it — callers show the paywall.
export async function serverGenerate({ kind, model, params = {}, count = 1, influencerId = null, onProgress, isCancelled, resolveBlobs = true }) {
  let sub
  try {
    sub = await api.generate.submit({ kind, model, params, count, influencerId })
  } catch (e) {
    console.warn('[vymotion] submit failed:', e.status, e.message, e.body?.detail)
    if (e.status === 402) {
      // Pop the global paywall (CreditChip listens) — the 402 body carries the quoted cost
      // and current balance so the modal can show exactly how short the user is.
      try {
        window.dispatchEvent(new CustomEvent('vymotion:paywall', {
          detail: { needed: e.body?.cost ?? null, balance: e.body?.balance ?? null },
        }))
      } catch { /* never let UI plumbing break the error path */ }
      const err = new Error(CREDITS_MSG)
      err.status = 402
      throw err
    }
    // Keep the real failure visible and machine-readable. The word "credit" must NOT
    // appear here: only a true 402 may read as out-of-credits in the UI.
    const code = e.body?.error || (e.status ? `HTTP ${e.status}` : 'network')
    const err = new Error(`Generation failed (${code}) — nothing was charged.`)
    err.status = e.status
    err.body = e.body
    throw err
  }

  // Claude prompt calls return synchronously.
  if (sub.status === 'delivered') {
    notifyCreditsChanged()
    return { generationId: sub.generation_id, cost: sub.cost, status: 'delivered', text: sub.text, assets: [] }
  }

  let last = sub
  for (let i = 0; i < MAX_POLLS; i++) {
    if (isCancelled?.()) {
      await api.generate.cancel(sub.generation_id).catch(() => {})
      notifyCreditsChanged()
      return { generationId: sub.generation_id, cost: sub.cost, status: 'cancelled', assets: [] }
    }
    await new Promise((r) => setTimeout(r, POLL_MS))
    last = await api.generate.status(sub.generation_id)
    onProgress?.(last.status, i)
    if (['delivered', 'failed', 'nsfw', 'cancelled'].includes(last.status)) break
  }

  // Settle/release already ran server-side — refresh chip so hold disappears.
  notifyCreditsChanged()

  if (last.status !== 'delivered') {
    if (last.error) console.warn('[vymotion] generation failed:', last.error)
    const reason = last.status === 'nsfw'
      ? 'Generation was filtered (NSFW) — no credits were charged.'
      : ['queued', 'in_progress'].includes(last.status)
        ? 'Still processing — it will appear on your Dashboard when ready. Credits are only charged on success.'
        : 'Generation failed — no credits were charged.'
    throw new Error(reason)
  }

  const assets = last.output_assets || []
  if (resolveBlobs) {
    for (const a of assets) {
      try { a.blobUrl = await fetchAssetBlobUrl(a.id) } catch { /* leave unresolved */ }
    }
  }
  return { generationId: sub.generation_id, cost: sub.cost, status: 'delivered', assets }
}

// Convenience wrappers mirroring the old generator entry points.
// `references` accepts any mix of data-URLs / http(s) URLs / site paths — resolved automatically.
export async function serverGenerateImage({ prompt, aspectRatio = '9:16', resolution = '2k', model = 'gpt_image_2', quality = 'medium', references = [], count = 1, influencerId, onProgress, isCancelled }) {
  const refs = await resolveRefUrls(references)
  return serverGenerate({
    kind: 'image', model, count, influencerId, onProgress, isCancelled,
    params: { prompt, aspect_ratio: aspectRatio, resolution, quality, references: refs },
  })
}

export function serverGenerateVideo({ prompt, aspectRatio = '9:16', duration = 5, resolution = '1080p', startFrameUrl = null, model = 'seedance_lite', influencerId, onProgress, isCancelled }) {
  return serverGenerate({
    kind: 'video', model, influencerId, onProgress, isCancelled,
    params: { prompt, aspect_ratio: aspectRatio, duration, resolution, startFrameUrl },
  })
}

// Metered Claude call. Returns the delivered generation ({ text, ... }). `model` maps to the
// server's model_override (else the Worker's DEFAULT_MODEL). Supports vision: pass image blocks
// inside `messages` content exactly as the Anthropic API expects.
export function serverPrompt({ prompt, system, messages, maxTokens, model }) {
  return serverGenerate({ kind: 'prompt', params: { prompt, system, messages, max_tokens: maxTokens, model_override: model } })
}

// Drop-in server-side replacement for utils/higgsfieldGenerate.generateNImages — identical
// contract: streams each image URL via onResult(url), reports onProgress(pct), throws
// 'CANCELLED' on cancel. Used by Photo Studio batch generation.
export async function serverGenerateNImages({ prompt, count = 1, aspectRatio = '9:16', resolution = '4k', model = 'gpt_image_2', quality = 'medium', referenceImage = null, outfitImage = null, closeUpImage1 = null, closeUpImage2 = null, propImages = [], onProgress, onResult, isCancelled }) {
  onProgress?.(5)
  const refs = await resolveRefUrls([referenceImage, outfitImage, closeUpImage1, closeUpImage2, ...propImages])
  onProgress?.(18)

  const prompts = Array.isArray(prompt) ? prompt : Array.from({ length: count }, () => prompt)
  const total = prompts.length
  let delivered = 0
  let lastErr = null

  for (const p of prompts) {
    if (isCancelled?.()) throw new Error('CANCELLED')
    try {
      const res = await serverGenerate({
        kind: 'image', model, count: 1, isCancelled, resolveBlobs: false,
        params: { prompt: p, aspect_ratio: aspectRatio, resolution, quality, references: refs },
        onProgress: () => onProgress?.(Math.min(22 + (delivered / total) * 73, 95)),
      })
      if (res.status === 'cancelled') throw new Error('CANCELLED')
      for (const a of res.assets) {
        delivered++
        onResult?.(publicAssetUrl(a.id))
        onProgress?.(Math.min(22 + (delivered / total) * 73, 95))
      }
    } catch (e) {
      if (e.message === 'CANCELLED' || e.status === 402) throw e
      lastErr = e
      console.warn('[vymotion] server generation failed for one prompt:', e.message)
    }
  }

  if (!delivered) throw lastErr || new Error('Generation failed — no credits were charged.')
  onProgress?.(100)
}

// Drop-in server replacement for generateSingleImage — same contract: resolves to one URL
// string (or null), throws on total failure. `references` overrides the two named ref slots
// when a caller (e.g. pose previews) has an arbitrary ref list. `kind` lets pose/sheet
// operations hit their own price-book rows.
export async function serverGenerateSingleImage({ prompt, aspectRatio = '16:9', resolution = '4k', model = 'gpt_image_2', quality = 'medium', kind = 'image', referenceImage = null, outfitImage = null, references = null, influencerId = null, onProgress, isCancelled }) {
  onProgress?.(5)
  const refs = await resolveRefUrls(references || [referenceImage, outfitImage])
  onProgress?.(18)
  const res = await serverGenerate({
    kind, model, count: 1, influencerId, isCancelled, resolveBlobs: false,
    params: { prompt, aspect_ratio: aspectRatio, resolution, quality, references: refs },
    onProgress: () => onProgress?.(60),
  })
  if (res.status === 'cancelled') return null
  onProgress?.(100)
  return res.assets[0] ? publicAssetUrl(res.assets[0].id) : null
}

// Drop-in server replacement for generateThreeImages' generation half — the caller has
// already composed the final prompt strings (incl. reference instructions). Streams partials,
// returns urls[] (≤ prompts.length), throws only if nothing delivered.
export async function serverGenerateThreeImages({ prompts, model = 'gpt_image_2', refs = [], aspectRatio = '9:16', resolution = '2k', quality = 'medium', onProgress, onPartialResults }) {
  onProgress?.(5)
  const resolved = await resolveRefUrls(refs)
  onProgress?.(15)
  const urls = []
  let done = 0
  for (const p of prompts) {
    try {
      const res = await serverGenerate({
        kind: 'image', model, count: 1, resolveBlobs: false,
        params: { prompt: p, aspect_ratio: aspectRatio, resolution, quality, references: resolved },
        onProgress: () => onProgress?.(Math.min(20 + (done / prompts.length) * 75, 95)),
      })
      for (const a of res.assets) urls.push(publicAssetUrl(a.id))
      done++
      onProgress?.(Math.min(20 + (done / prompts.length) * 75, 95))
      if (urls.length) onPartialResults?.([...urls])
    } catch (e) {
      if (e.status === 402) throw e
      console.warn('[vymotion] one variation failed:', e.message)
    }
  }
  if (!urls.length) throw new Error('No images were generated — try regenerating')
  onProgress?.(100)
  return urls
}

// Drop-in server replacement for generateVideo — returns { urls, shareUrls: [] } like the MCP
// path. v1 limitation: the server path (Seedance) takes ONE start image and no audio track;
// extra product refs / audioRef stay client-side-only until a multi-ref video model lands.
export async function serverGenerateVideoStudio({ prompt, aspectRatio = '9:16', duration = 8, count = 1, resolution = '1080p', startFrameUrl = null, referenceImages = [], model = 'seedance_lite', influencerId = null, onProgress, onPartialResults, isCancelled }) {
  onProgress?.(5)
  const start = startFrameUrl || referenceImages.filter(Boolean)[0] || null
  const [startRef] = start ? await resolveRefUrls([start]) : []
  onProgress?.(12)
  const urls = []
  let lastErr = null
  for (let i = 0; i < count; i++) {
    if (isCancelled?.()) break
    try {
      const res = await serverGenerate({
        kind: 'video', model, count: 1, influencerId, isCancelled, resolveBlobs: false,
        params: { prompt, aspect_ratio: aspectRatio, duration, resolution, startFrameUrl: startRef || null },
        onProgress: () => onProgress?.(Math.min(15 + ((i + 0.5) / count) * 80, 95)),
      })
      for (const a of res.assets) urls.push(publicAssetUrl(a.id))
      if (urls.length) onPartialResults?.([...urls])
    } catch (e) {
      if (e.status === 402) throw e
      lastErr = e
      console.warn('[vymotion] video generation failed:', e.message)
    }
  }
  if (!urls.length) throw lastErr || new Error('Video generation failed — no credits were charged.')
  onProgress?.(100)
  return { urls, shareUrls: [] }
}
