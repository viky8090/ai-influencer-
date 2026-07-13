// Provider routing (PRD §12.7) — STRICTLY by the user's selected model: the model you pick is
// the model that runs, refs or not. Higgsfield hosts only its native Soul; every other model
// (GPT Image, nano-banana/Gemini, Seedream, Krea, all video) runs on fal.ai, where each has a
// real ref-capable /edit variant for character consistency. (The old capability-split that
// force-routed any with-refs image to HF popcorn/auto silently ignored the model choice.)
import * as higgsfield from './higgsfield.js'
import * as fal from './fal.js'

const FAL_IMAGE_MODELS = new Set(['gpt_image_2', 'nano_banana_2', 'nano_banana_flash', 'seedream_4', 'flux_krea'])

export function pickProvider(kind, model, params = {}) {
  if (kind === 'prompt') return 'anthropic'
  if (kind === 'video' || model === 'seedance_2_0') return 'fal' // ALL video models live on fal
  if (FAL_IMAGE_MODELS.has(model)) return 'fal'
  return 'higgsfield' // soul_2 (HF-native, soul/reference handles its 1 ref) + unknown models
}

// Uniform surface per generation provider: buildRequest(model, params) + submit(env, path, body, webhookUrl).
export const adapters = { higgsfield, fal }

export function isConfigured(provider, env) {
  return provider === 'fal' ? !!env.FAL_API_KEY : !!env.HF_API_KEY
}
