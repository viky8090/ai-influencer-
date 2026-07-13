// Anthropic Claude adapter (PRD §12.5, Appendix B).
// Replaces the old api/claude.js where the caller supplied their own key — here the
// Vymotion server-side key is injected and usage is metered.
const API = 'https://api.anthropic.com/v1/messages'
const VERSION = '2023-06-01'

// Default to the most capable model for prompt intelligence; Haiku is a cheaper
// fallback for trivial calls (the model→credit mapping lives in the price book).
export const DEFAULT_MODEL = 'claude-opus-4-8'
export const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

export async function messages(env, { model = DEFAULT_MODEL, system, messages, max_tokens = 1024 }) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, system, messages, max_tokens }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json()
  // TODO(phase-3): surface usage.input_tokens/output_tokens so the DO can token-scale
  // the credit cost when a call materially exceeds the flat estimate (FR-C3).
}
