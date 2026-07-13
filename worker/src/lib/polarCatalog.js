// Plan + pack catalog — Polar sync and D1 polar_products source of truth.
// B3 hybrid + Starter $5 entry (200 VC/mo). Annual ≈ 10× monthly (~2 months free).
// Packs ~$0.04/VC.
//
// Credit tiers (B4): Creator/Pro/Studio each come in multiple credit sizes selected by the
// pricing-page slider. Same plan key (feature gates unchanged — gates read subscriptions.plan),
// different grant_vc + price. checkout picks the row via the `credits` discriminator
// (annual rows grant 12× the monthly tier). Per-VC rate falls as the tier rises so the
// slider always reads as "more credits, cheaper credits".

export const B3_CATALOG = [
  // Starter — full product surface, personal-use, no premium video (Seedance 2 / Veo).
  // Single fixed tier: 200 VC @ $5 ≈ $0.025/VC list. NO annual discount on the $5 entry
  // (annual = flat 12× monthly) — the 17%-off annual deal starts at Creator.
  { kind: 'plan', key: 'starter', interval: 'month', name: 'Starter',          cents: 500,    grantVc: 200 },
  { kind: 'plan', key: 'starter', interval: 'year',  name: 'Starter (annual)', cents: 6000,   grantVc: 2400 },

  // Creator — $0.0483/VC base → $0.0467/VC at 900.
  { kind: 'plan', key: 'creator', interval: 'month', name: 'Creator 600',           cents: 2900,   grantVc: 600 },
  { kind: 'plan', key: 'creator', interval: 'year',  name: 'Creator 600 (annual)',  cents: 29000,  grantVc: 7200 },
  { kind: 'plan', key: 'creator', interval: 'month', name: 'Creator 900',           cents: 4200,   grantVc: 900 },
  { kind: 'plan', key: 'creator', interval: 'year',  name: 'Creator 900 (annual)',  cents: 42000,  grantVc: 10800 },

  // Pro — $0.0383 → $0.0367 → $0.035/VC.
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 1800',          cents: 6900,   grantVc: 1800 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 1800 (annual)', cents: 69000,  grantVc: 21600 },
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 2700',          cents: 9900,   grantVc: 2700 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 2700 (annual)', cents: 99000,  grantVc: 32400 },
  { kind: 'plan', key: 'pro', interval: 'month', name: 'Pro 3600',          cents: 12600,  grantVc: 3600 },
  { kind: 'plan', key: 'pro', interval: 'year',  name: 'Pro 3600 (annual)', cents: 126000, grantVc: 43200 },

  // Studio — $0.0325 → $0.0311 → $0.0299/VC (lowest cost per credit).
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 5500',           cents: 17900,  grantVc: 5500 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 5500 (annual)',  cents: 179000, grantVc: 66000 },
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 8000',           cents: 24900,  grantVc: 8000 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 8000 (annual)',  cents: 249000, grantVc: 96000 },
  { kind: 'plan', key: 'studio', interval: 'month', name: 'Studio 11000',          cents: 32900,  grantVc: 11000 },
  { kind: 'plan', key: 'studio', interval: 'year',  name: 'Studio 11000 (annual)', cents: 329000, grantVc: 132000 },

  { kind: 'pack', key: 'small',  interval: null, name: '500 credits',    cents: 2000,  grantVc: 500 },
  { kind: 'pack', key: 'medium', interval: null, name: '1,500 credits',  cents: 5500,  grantVc: 1500 },
  { kind: 'pack', key: 'large',  interval: null, name: '5,000 credits',  cents: 16000, grantVc: 5000 },
  { kind: 'pack', key: 'mega',   interval: null, name: '15,000 credits', cents: 45000, grantVc: 15000 },
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
