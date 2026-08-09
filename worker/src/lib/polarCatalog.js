// Plan + pack catalog — Polar sync and D1 polar_products source of truth.
// B3 hybrid + Starter entry (200 VC/mo). Annual = exactly 10× monthly sticker (~2 months
// free) — the frontend derives every annual display from the monthly `m`, so keep the ratio.
//
// FEE GROSS-UP (2026-07-22): stickers are grossed up so Vymotion nets the former list price
// after Polar's worst-case cut (Starter tier: 5% + $0.50, +1.5% international cards = 6.5%
// + $0.50). price = (old_net + 0.50)/0.935 rounded up to .99. E.g. Starter $5.99 nets
// $5.10–5.19; Creator 600 $31.99 nets $29.41+. Annual transactions net MORE than 12× the
// monthly net (one fixed 50¢ instead of twelve). If Polar's fee tier ever changes
// (polar.sh/docs/merchant-of-record/fees), recompute. Polar cannot surcharge buyers, and
// fees must never be labeled as tax — the gross-up is the only compliant pass-through.
//
// Credit tiers (B4): Creator/Pro/Studio each come in multiple credit sizes selected by the
// pricing-page slider. Same plan key (feature gates unchanged — gates read subscriptions.plan),
// different grant_vc + price. checkout picks the row via the `credits` discriminator
// (annual rows grant 12× the monthly tier). Per-VC rate falls as the tier rises so the
// slider always reads as "more credits, cheaper credits".

export const B3_CATALOG = [
  // Starter — full product surface, personal-use, no premium video (Seedance 2 / Veo).
  // Single fixed tier: 200 VC @ $5.99 (nets ≈$5). NO annual discount on the entry plan
  // (annual = flat 12× monthly) — the 17%-off annual deal starts at Creator.
  { kind: 'plan', key: 'starter', interval: 'month', name: 'Starter',          cents: 599,    grantVc: 200 },
  { kind: 'plan', key: 'starter', interval: 'year',  name: 'Starter (annual)', cents: 7188,   grantVc: 2400 },

  // Creator — nets ≈$29/$42 (old list) per month after fees.
  { kind: 'plan', key: 'creator', interval: 'month', name: 'Creator 600',           cents: 3199,   grantVc: 600 },
  { kind: 'plan', key: 'creator', interval: 'year',  name: 'Creator 600 (annual)',  cents: 31990,  grantVc: 7200 },
  { kind: 'plan', key: 'creator', interval: 'month', name: 'Creator 900',           cents: 4599,   grantVc: 900 },
  { kind: 'plan', key: 'creator', interval: 'year',  name: 'Creator 900 (annual)',  cents: 45990,  grantVc: 10800 },

  // Pro — nets ≈$69/$99/$126 per month after fees.
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 1800',          cents: 7499,   grantVc: 1800 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 1800 (annual)', cents: 74990,  grantVc: 21600 },
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 2700',          cents: 10699,  grantVc: 2700 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 2700 (annual)', cents: 106990, grantVc: 32400 },
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 3600',          cents: 13599,  grantVc: 3600 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 3600 (annual)', cents: 135990, grantVc: 43200 },

  // Studio — nets ≈$179/$249/$329 per month after fees (lowest cost per credit).
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 5500',           cents: 19199,  grantVc: 5500 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 5500 (annual)',  cents: 191990, grantVc: 66000 },
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 8000',           cents: 26699,  grantVc: 8000 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 8000 (annual)',  cents: 266990, grantVc: 96000 },
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 11000',          cents: 35299,  grantVc: 11000 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 11000 (annual)', cents: 352990, grantVc: 132000 },

  // Packs — net ≈$20/$55/$160/$450 (old list) after fees.
  { kind: 'pack', key: 'small',  interval: null, name: '500 credits',    cents: 2199,  grantVc: 500 },
  { kind: 'pack', key: 'medium', interval: null, name: '1,500 credits',  cents: 5999,  grantVc: 1500 },
  { kind: 'pack', key: 'large',  interval: null, name: '5,000 credits',  cents: 17199, grantVc: 5000 },
  { kind: 'pack', key: 'mega',   interval: null, name: '15,000 credits', cents: 48199, grantVc: 15000 },
]

// One Polar product per catalog row — tiers of the same plan are distinct products,
// so the map key must carry the credit size too.
export function catalogMapKey(item) {
  return `${item.key}:${item.interval || ''}:${item.grantVc}`
}

// Group key for the D1 delete pass (all tiers of a plan+interval share one group).
export function catalogGroupKey(item) {
  return `${item.kind}:${item.key}:${item.interval || ''}`
}
