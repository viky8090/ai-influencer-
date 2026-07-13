// Friendly names for credit-ledger rows — shared by the Usage page and the nav CreditsPanel
// so both surfaces describe activity identically (no raw provider/ledger jargon anywhere).

export const MODEL_NAMES = {
  soul_2: 'Higgsfield Soul',
  gpt_image_2: 'GPT Image 2',
  nano_banana_2: 'Nano Banana Pro',
  nano_banana_flash: 'Nano Banana 2',
  seedance_2_0: 'Seedance 2',
  seedance_lite: 'Seedance Lite',
  seedance_pro: 'Seedance Pro',
  kling_2_5_pro: 'Kling 2.5 Pro',
  sora_2: 'Sora 2',
  veo_3_fast: 'Veo 3 Fast',
  seedream_4: 'Seedream 4',
  flux_krea: 'FLUX Krea',
}

export const GEN_KIND_NAMES = {
  image: 'Image generation',
  pose: 'Pose preview',
  sheet: 'Character sheet',
  video: 'Video generation',
  prompt: 'AI prompt assist',
}

export const PACK_NAMES = { small: '500', medium: '1,500', large: '5,000', mega: '15,000' }
export const PLAN_NAMES = { creator: 'Creator', pro: 'Pro', studio: 'Studio' }

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fmtWhen(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// One ledger row → { title, detail, tone }. tone: 'plus' | 'minus' | 'muted'
export function describeEntry(e) {
  const genLabel = () => {
    const what = GEN_KIND_NAMES[e.gen_kind] || 'Generation'
    const model = MODEL_NAMES[e.gen_model]
    return model && e.gen_kind !== 'prompt' ? `${what} — ${model}` : what
  }
  switch (e.kind) {
    case 'grant': {
      const r = e.reason || ''
      if (r === 'free_signup_bonus') return { title: 'Welcome bonus', detail: 'Free credits on sign-up', tone: 'plus' }
      const pack = r.match(/^pack_(\w+)$/)
      if (pack) return { title: `Credit pack purchase`, detail: `${PACK_NAMES[pack[1]] || pack[1]} top-up credits${e.expires_at ? ` · valid until ${fmtDate(e.expires_at)}` : ''}`, tone: 'plus' }
      const plan = r.match(/^plan_(\w+?)_(\w+)$/)
      if (plan) {
        const name = PLAN_NAMES[plan[1]] || plan[1]
        return plan[2] === 'cycle'
          ? { title: `${name} plan renewal`, detail: 'Monthly plan credits', tone: 'plus' }
          : { title: `${name} plan credits`, detail: 'Subscription started or upgraded', tone: 'plus' }
      }
      return { title: 'Credits added', detail: r || null, tone: 'plus' }
    }
    case 'spend':
      return { title: genLabel(), detail: 'Completed and delivered', tone: 'minus' }
    case 'hold':
      return { title: genLabel(), detail: 'In progress — credits reserved', tone: 'muted' }
    case 'release': {
      const r = e.reason || ''
      const why = r.includes('timeout') ? 'generation timed out'
        : r.includes('nsfw') ? 'content was filtered'
        : r.includes('cancel') ? 'generation canceled'
        : 'generation didn’t complete'
      return { title: 'Refund', detail: `Credits returned — ${why}. You were not charged.`, tone: 'plus' }
    }
    case 'expire':
      return { title: 'Plan credits reset', detail: 'Unused plan credits from the previous cycle', tone: 'muted' }
    default:
      return { title: e.kind, detail: e.reason || null, tone: 'muted' }
  }
}

// Resolved holds are noise: once a spend or refund exists for the same generation, the hold
// row is its bookkeeping shadow (same deduction). Show only the outcome; keep live holds.
export function collapseResolvedHolds(entries) {
  const resolved = new Set(
    entries.filter((e) => (e.kind === 'spend' || e.kind === 'release') && e.ref_type === 'generation' && e.ref_id)
      .map((e) => e.ref_id)
  )
  return entries.filter((e) => !(e.kind === 'hold' && e.ref_id && resolved.has(e.ref_id)))
}
