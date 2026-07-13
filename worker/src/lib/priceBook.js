// Cost computation from the versioned price book (PRD §10.2).
// Hot reads come from KV (a mirror of the active rows); D1 is the source of truth.
//
// Reprice v2 (migration 0011): unit VC covers live fal/HF/Claude COGS at ≥60% margin
// at pack anchor ~$0.04/VC. Quote applies quality / resolution / vision multipliers
// so expensive defaults cannot under-charge.

export async function getActivePriceBook(env) {
  // KV is an optional hot cache; fall back to D1 directly when it isn't bound.
  if (env.KV) {
    const cached = await env.KV.get('price_book:active', 'json')
    if (cached) return cached
  }
  const { results } = await env.DB
    .prepare('SELECT operation, model, unit, cost_vc FROM price_book WHERE active = 1')
    .all()
  if (env.KV) await env.KV.put('price_book:active', JSON.stringify(results), { expirationTtl: 300 })
  return results
}

// Prefer an exact (operation, model) match; fall back to (operation, any-model).
export function lookupCost(book, operation, model) {
  return (
    book.find((r) => r.operation === operation && r.model === model) ||
    book.find((r) => r.operation === operation && r.model == null) ||
    null
  )
}

function is4k(resolution) {
  const s = String(resolution || '').toLowerCase()
  return s.includes('4') && (s.includes('k') || s === '4k' || s.includes('4k'))
}

function is1080(resolution) {
  const s = String(resolution || '').toLowerCase()
  return s.includes('1080') || s === '1080p'
}

function isHighQuality(quality) {
  return String(quality || '').toLowerCase() === 'high'
}

// Quote the total VC for an action. Batches multiply by count; video adds extras.
// Costs round UP to whole credits (no fractional credits are ever stored — §10.1).
//
// opts:
//   quality     — image quality (gpt_image_2: medium default, high → premium row/multiplier)
//   resolution  — image/video resolution (4K nano pro ×2; seedance_2 1080p ×2.25)
//   vision      — Claude prompt with image input → model 'vision' row (5 VC)
export function quote(book, {
  operation,
  model,
  count = 1,
  extraSeconds = 0,
  upscale4k = false,
  quality = null,
  resolution = null,
  vision = false,
} = {}) {
  // Vision prompts bill as prompt/vision when present.
  let lookupModel = model
  if (operation === 'prompt' && vision) lookupModel = 'vision'
  // Prefer dedicated high-quality GPT row when present.
  if (operation === 'image' && model === 'gpt_image_2' && isHighQuality(quality)) {
    const high = lookupCost(book, 'image', 'gpt_image_2_high')
    if (high) {
      let total = high.cost_vc * count
      return Math.ceil(total)
    }
  }

  const base = lookupCost(book, operation, lookupModel)
  if (!base) throw new Error(`No active price for ${operation}/${lookupModel ?? 'any'}`)

  let total = base.cost_vc * count

  // GPT high without a dedicated row: scale medium base (12) → 22
  if (operation === 'image' && model === 'gpt_image_2' && isHighQuality(quality)) {
    total = Math.ceil(total * (22 / 12))
  }

  // Nano Banana Pro 4K is 2× on fal
  if (operation === 'image' && model === 'nano_banana_2' && is4k(resolution)) {
    total *= 2
  }

  if (operation === 'video') {
    if (extraSeconds > 0) {
      const sec = lookupCost(book, 'video_extra_second', model)
      if (sec) total += sec.cost_vc * extraSeconds * count
    }
    if (upscale4k) {
      const up = lookupCost(book, 'video_4k_upscale', model)
      if (up) total += up.cost_vc * count
    }
    // Seedance 2.0 1080p COGS ≈ 2.25× 720p ($0.682 / $0.3034)
    if (model === 'seedance_2_0' && is1080(resolution)) {
      total = Math.ceil(total * 2.25)
    }
  }

  return Math.ceil(total)
}
