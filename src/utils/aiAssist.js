// Context-aware writing assistant. One metered Claude call per click that writes text for a
// SPECIFIC content field — always tuned to the particular influencer's voice and to what that
// field is for. Deliberately narrow: three "purposes" (caption / backstory / script), each with
// its own system prompt and context builder, so the output is never generic marketing jargon.
//
// Dual-path, same as backstoryAnalysis.js / charSheetPrompt.js:
//   • signed-in Vymotion  → serverPrompt() (metered, 2 VC text / 5 VC vision)
//   • signed-out          → /api/claude proxy with the user's own claude_api_key
import { isVymotionSession, serverPrompt } from '../api/serverGenerate'

const CLAUDE_KEY = 'claude_api_key'
// Vision-capable model for the signed-out BYO-key path. Signed-in omits the model so the Worker
// uses its verified vision-capable default (claude-opus-4-8), matching charSheetPrompt.js.
const FALLBACK_MODEL = 'claude-sonnet-4-6'

function trimTo(str, n) {
  const s = String(str || '').trim()
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

// ── Per-field prompt registry ────────────────────────────────────────────
// Each purpose: system (the rules) + buildUser(context, draft) (the specifics for THIS field).
const PURPOSES = {
  caption: {
    maxTokens: 320,
    system: `You are the ghostwriter for one specific social-media influencer. Write the caption they would post themselves — in their own voice, for the exact platform, about the exact photo or video attached.

Rules:
- Sound like a real person, never like a brand. No corporate marketing speak and no filler buzzwords ("unlock", "elevate", "game-changer", "dive in", "in today's world", "level up", "curated").
- Match the platform's norm: Instagram = warm, a couple of tasteful hashtags at the end; X/Twitter = short and punchy, at most one hashtag; LinkedIn = grounded and professional, no hashtag spam; TikTok = casual and hooky; anything else = natural and human.
- If they gave a rough draft, keep its intent and sharpen it — do not throw away their idea.
- Return ONE caption only. No surrounding quotes, no "Option 1/2", no explanation. Emoji only if it genuinely fits their voice.`,
    buildUser: (ctx, draft) => {
      const inf = ctx.influencer || {}
      const lines = [`Influencer: ${inf.name || 'the creator'}`]
      if (inf.niche) lines.push(`Niche: ${inf.niche}`)
      if (inf.voice) lines.push(`Voice / tone: ${inf.voice}`)
      if (inf.audience) lines.push(`Audience: ${inf.audience}`)
      const pillars = Array.isArray(inf.contentPillars) ? inf.contentPillars.filter(Boolean) : []
      if (pillars.length) lines.push(`Content themes: ${pillars.join(', ')}`)
      if (inf.backstory) lines.push(`Background: ${trimTo(inf.backstory, 240)}`)
      if (ctx.platforms?.length) lines.push(`Posting to: ${ctx.platforms.join(', ')}`)
      lines.push(`Media: ${ctx.mediaType === 'video' ? 'a short video clip' : ctx.hasImage ? 'the attached image (look at it and write about what is actually shown)' : 'no media — a text post'}`)
      lines.push(draft?.trim()
        ? `\nTheir rough draft to improve:\n"${draft.trim()}"`
        : `\nWrite the caption from scratch.`)
      return lines.join('\n')
    },
  },

  backstory: {
    maxTokens: 400,
    system: `You write the backstory for a fictional AI-influencer persona. It should read like a real person's story — specific and a little particular, not a press release.

Rules:
- 2 to 4 short sentences, third person.
- Concrete details over clichés. Ban "passionate about", "on a journey", "living life to the fullest", "believes that", "isn't just... it's".
- Make their niche and personality feel earned, and give a content creator something real to work with.
- Output the backstory text only — no preamble, no quotes, no bullet points.`,
    buildUser: (ctx, draft) => {
      const d = ctx || {}
      const lines = []
      if (d.name) lines.push(`Name: ${d.name}`)
      if (d.gender) lines.push(`Gender: ${d.gender}`)
      if (d.age) lines.push(`Age: ${d.age}`)
      const niches = Array.isArray(d.niches) ? d.niches.filter((n) => n && n !== 'Other') : []
      const niche = [niches.join(', '), d.nicheCustom].filter(Boolean).join(' — ')
      if (niche) lines.push(`Niche: ${niche}`)
      const vibes = Array.isArray(d.vibeWords) ? d.vibeWords.filter(Boolean) : []
      if (vibes.length) lines.push(`Style / vibe: ${vibes.join(', ')}`)
      if (typeof d.personality === 'number') {
        lines.push(`Personality: ${d.personality < 35 ? 'thoughtful, more introverted' : d.personality > 65 ? 'bold, outgoing' : 'balanced, versatile'}`)
      }
      if (d.hobbies) lines.push(`Hobbies: ${d.hobbies}`)
      if (draft?.trim()) lines.push(`\nImprove this existing backstory instead of starting over:\n"${draft.trim()}"`)
      return lines.join('\n') || 'Write a plausible, grounded backstory for a brand-new influencer.'
    },
  },

  script: {
    maxTokens: 220,
    system: `You write the spoken line an influencer says to camera in a short vertical video (Reels / TikTok / Shorts).

Rules:
- Write ONLY the words said out loud. No scene directions, no camera notes, no emoji, no hashtags, no surrounding quotes.
- Their real speaking voice: natural spoken rhythm, contractions, a hook up front. Not an ad read unless the topic is clearly a product.
- Short — it has to land in a few seconds. Usually 1 to 3 sentences.
- If they gave a topic or draft, build on it rather than replacing it.`,
    buildUser: (ctx, draft) => {
      const inf = ctx.influencer || {}
      const lines = [`Influencer: ${inf.name || 'the creator'}`]
      if (inf.niche) lines.push(`Niche: ${inf.niche}`)
      if (inf.voice) lines.push(`Voice / tone: ${inf.voice}`)
      if (inf.audience) lines.push(`Audience: ${inf.audience}`)
      if (inf.backstory) lines.push(`Background: ${trimTo(inf.backstory, 240)}`)
      lines.push(draft?.trim()
        ? `\nWhat they want to talk about (draft/topic):\n"${draft.trim()}"`
        : `\nWrite something on-brand for them to say to camera.`)
      return lines.join('\n')
    },
  },
}

export function isAssistPurpose(purpose) {
  return Object.prototype.hasOwnProperty.call(PURPOSES, purpose)
}

// Build an Anthropic image content block from a src. Server-hosted http(s) URLs use a URL source
// (Anthropic fetches it — no browser CORS needed); data: URLs use base64 (same shape as
// charSheetPrompt.js). blob:/relative URLs aren't reachable by Claude, so they're skipped.
function toImageBlock(src) {
  if (typeof src !== 'string' || !src) return null
  if (src.startsWith('data:')) {
    const [header, base64] = src.split(',')
    if (!base64) return null
    const mediaType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
  }
  if (/^https?:\/\//.test(src)) return { type: 'image', source: { type: 'url', url: src } }
  return null
}

// Strip model scaffolding the UI shouldn't show: code fences and a single pair of wrapping quotes.
function cleanText(t) {
  let s = String(t || '').replace(/^```(?:\w+)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith('“') && s.endsWith('”'))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

// Generate text for a field. Throws { code:'SIGN_IN_REQUIRED' } when signed-out with no key so
// the UI can prompt sign-in; a 402 (no credits) surfaces via the global vymotion:paywall event.
export async function assistWrite({ purpose, context = {}, draft = '', images = [] }) {
  const spec = PURPOSES[purpose]
  if (!spec) throw new Error(`Unknown assist purpose: ${purpose}`)

  const vymotion = isVymotionSession()
  const apiKey = vymotion ? null : localStorage.getItem(CLAUDE_KEY)
  if (!vymotion && !apiKey) {
    const err = new Error('Sign in to use AI assist.')
    err.code = 'SIGN_IN_REQUIRED'
    throw err
  }

  const system = spec.system
  const userText = spec.buildUser(context, draft)
  const imageBlocks = (images || []).map(toImageBlock).filter(Boolean)
  const content = imageBlocks.length
    ? [...imageBlocks, { type: 'text', text: userText }]
    : userText
  const messages = [{ role: 'user', content }]

  let text
  if (vymotion) {
    const out = await serverPrompt({ system, messages, maxTokens: spec.maxTokens })
    text = out?.text?.trim()
  } else {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ model: FALLBACK_MODEL, max_tokens: spec.maxTokens, system, messages }),
    })
    if (!res.ok) throw new Error(`Couldn’t reach the writer (${res.status}).`)
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || 'The writer returned an error.')
    text = data.content?.[0]?.text?.trim()
  }

  const cleaned = cleanText(text)
  if (!cleaned) throw new Error('Nothing came back — try again.')
  return cleaned
}
