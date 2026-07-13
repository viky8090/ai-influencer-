// Generation submit — POST /api/generate (PRD §12.3).
// Pipeline: quote (price book) → hold (CreditAccount DO) → persist row → submit to provider.
// The webhook later copies the asset to R2 and settles (completed) or releases (failed/nsfw)
// the hold. Returns instantly with { generation_id, cost, status }.
import { Hono } from 'hono'
import { getActivePriceBook, quote } from '../lib/priceBook.js'
import { ulid, nowMs } from '../lib/ids.js'
import { pickProvider, adapters, isConfigured } from '../providers/registry.js'
import { billableSeconds } from '../providers/fal.js'
import { getActivePlan, canUsePremiumVideo, PREMIUM_VIDEO_MODELS } from '../lib/plans.js'
import * as anthropic from '../providers/anthropic.js'

const generate = new Hono()

// Detect Anthropic vision content blocks so prompt_vision pricing applies.
function messagesHaveVision(params = {}) {
  const msgs = params.messages || []
  for (const m of msgs) {
    const c = m?.content
    if (!Array.isArray(c)) continue
    for (const block of c) {
      if (!block || typeof block !== 'object') continue
      if (block.type === 'image' || block.type === 'image_url' || block.source?.type === 'base64') return true
    }
  }
  return false
}

// Hard caps — match UI batch sizes; protect quote/hold and provider quotas without
// changing normal product flows (app uses 1–4 images, 1 video, prompt calls).
const MAX_COUNT = 8
const MAX_BODY_CHARS = 1_500_000 // ~1.5 MB JSON (refs should be URLs, not huge base64)
const ALLOWED_KINDS = new Set(['image', 'video', 'prompt'])

generate.post('/', async (c) => {
  const user = c.get('user')

  // Fast size guard before full parse when Content-Length is present
  const cl = Number(c.req.header('content-length') || 0)
  if (cl > MAX_BODY_CHARS) return c.json({ error: 'payload_too_large', max: MAX_BODY_CHARS }, 413)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.kind) return c.json({ error: 'bad_request' }, 400)
  if (!ALLOWED_KINDS.has(body.kind)) return c.json({ error: 'bad_kind' }, 400)

  // Reject oversized payloads (e.g. multi-MB base64 stuffed into messages)
  try {
    if (JSON.stringify(body).length > MAX_BODY_CHARS) {
      return c.json({ error: 'payload_too_large', max: MAX_BODY_CHARS }, 413)
    }
  } catch {
    return c.json({ error: 'bad_request' }, 400)
  }

  const kind = body.kind
  const model = body.model || null
  const params = body.params && typeof body.params === 'object' ? body.params : {}
  // Client cannot pick Anthropic model — server price book assumes fixed prompt cost
  delete params.model_override
  const count = Math.min(MAX_COUNT, Math.max(1, Math.round(Number(body.count) || 1)))
  const influencerId = body.influencerId || null

  // Plan gates: premium video (Seedance 2 / Veo) is Creator+ only.
  const plan = await getActivePlan(c.env, user.id)
  if (kind === 'video' && PREMIUM_VIDEO_MODELS.has(model) && !canUsePremiumVideo(plan)) {
    return c.json({
      error: 'plan_required',
      detail: 'Seedance 2 and Veo 3 Fast require the Creator plan or higher.',
      model,
      plan,
    }, 403)
  }

  // 1. Quote from the server-side price book (never trust a client-sent cost).
  // Video: extra seconds beyond the 5s base clip are derived server-side from the SNAPPED
  // duration the model will actually render (billableSeconds mirrors the adapter's per-model
  // duration enums) — models without a video_extra_second row (e.g. fixed-8s Veo) are
  // unaffected by quote(). Quality / resolution / vision multipliers live in quote().
  let cost
  try {
    const book = await getActivePriceBook(c.env)
    const extraSeconds = kind === 'video'
      ? Math.max(0, billableSeconds(model, params) - 5)
      : 0
    const vision = kind === 'prompt' && messagesHaveVision(params)
    cost = quote(book, {
      operation: kind,
      model,
      count,
      extraSeconds,
      upscale4k: !!params.upscale4k,
      quality: params.quality || null,
      resolution: params.resolution || params.image_size || null,
      vision,
    })
  } catch (e) {
    return c.json({ error: 'no_price', detail: String(e.message) }, 400)
  }

  // 2. Hold credits via the user's CreditAccount DO (atomic; 402 if insufficient).
  const generationId = ulid()
  const acct = c.env.CREDIT_ACCOUNT.get(c.env.CREDIT_ACCOUNT.idFromName(user.id))
  const hold = await acct.quoteAndHold(user.id, cost, { type: 'generation', id: generationId })
  if (!hold.ok) return c.json({ error: 'insufficient_credits', cost, balance: hold.total ?? 0 }, 402)

  // 3. Persist the generation row (queued). Provider routing per §12.7 (fallback-only:
  // Higgsfield for its provisioned models, fal.ai for the rest, Anthropic for prompts).
  const ts = nowMs()
  const provider = pickProvider(kind, model, params)
  await c.env.DB.prepare(
    `INSERT INTO generations (id, user_id, influencer_id, kind, model, params_json, provider, status, cost_vc, hold_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(generationId, user.id, influencerId, kind, model, JSON.stringify(params), provider, 'queued', cost, hold.holdId, ts).run()

  // Helper: release the hold + fail the generation, so Vymotion credits are never stranded.
  const failAndRelease = async (reason, errText = reason) => {
    await acct.release(user.id, hold.holdId, reason)
    await c.env.DB.prepare('UPDATE generations SET status = ?, error = ? WHERE id = ?')
      .bind('failed', String(errText).slice(0, 200), generationId).run()
  }

  // 4. Submit to the provider (uniform adapter surface: buildRequest + submit + webhook).
  if (provider === 'higgsfield' || provider === 'fal') {
    if (!isConfigured(provider, c.env)) { await failAndRelease('provider_not_configured'); return c.json({ error: 'generation_backend_not_configured', generation_id: generationId }, 503) }
    const adapter = adapters[provider]
    const req = adapter.buildRequest(model, params)
    if (!req) { await failAndRelease('unsupported_model'); return c.json({ error: 'unsupported_model', model }, 400) }
    const webhookUrl = `${c.env.API_URL}/webhooks/${provider}`

    let sub
    try {
      sub = await adapter.submit(c.env, req.path, req.body, webhookUrl)
    } catch (e) {
      // HF signals unfunded accounts with 403; fal with 401/403 — either way the hold releases.
      const noCredits = e.status === 403 || (provider === 'fal' && e.status === 401)
      await failAndRelease(noCredits ? 'provider_no_credits' : 'submit_failed', e.message)
      return c.json({ error: noCredits ? 'provider_no_credits' : 'submit_failed', detail: String(e.message).slice(0, 200) }, 502)
    }

    const reqId = sub.request_id || sub.id || sub.job_id || null
    await c.env.DB.prepare('UPDATE generations SET status = ?, provider_request_id = ? WHERE id = ?')
      .bind('in_progress', reqId, generationId).run()
    return c.json({ generation_id: generationId, cost, status: 'in_progress', provider_request_id: reqId })
  }

  // Claude 'prompt' — synchronous: call Anthropic inline, settle on success, release on error.
  if (!c.env.ANTHROPIC_API_KEY) {
    await failAndRelease('provider_not_configured')
    return c.json({ error: 'generation_backend_not_configured', generation_id: generationId }, 503)
  }
  try {
    const messages = params.messages || [{ role: 'user', content: params.prompt || params.text || '' }]
    const resp = await anthropic.messages(c.env, {
      model: anthropic.DEFAULT_MODEL,
      system: params.system,
      messages,
      max_tokens: Math.min(params.max_tokens || 1024, 4096),
    })
    const text = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    await c.env.DB.prepare('UPDATE generations SET status=?, output_assets_json=?, delivered_at=? WHERE id=?')
      .bind('delivered', JSON.stringify([{ type: 'text', text }]), nowMs(), generationId).run()
    await acct.settle(user.id, hold.holdId, { type: 'generation', id: generationId })
    return c.json({ generation_id: generationId, cost, status: 'delivered', text })
  } catch (e) {
    await failAndRelease('provider_error', e.message)
    return c.json({ error: 'provider_error', detail: String(e.message).slice(0, 200) }, 502)
  }
})

export default generate
