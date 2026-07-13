// Sync Vymotion B3 plan + pack products to Polar and emit D1 polar_products SQL.
// Prefer the live endpoint POST /internal/sync-b3-pricing (ADMIN_SECRET) which also
// archives old products and rewrites D1. This script is the offline equivalent.
//
//   POLAR_ACCESS_TOKEN=polar_oat_... node scripts/create-polar-products.mjs
//   POLAR_API_BASE=https://api.polar.sh POLAR_ACCESS_TOKEN=... node scripts/create-polar-products.mjs
//
// Numbers: worker/src/lib/polarCatalog.js (B3 hybrid reprice).

import { B3_CATALOG, catalogMapKey } from '../src/lib/polarCatalog.js'

const BASE = process.env.POLAR_API_BASE || 'https://sandbox-api.polar.sh'
const TOKEN = process.env.POLAR_ACCESS_TOKEN
if (!TOKEN) {
  console.error('Set POLAR_ACCESS_TOKEN (organization access token).')
  process.exit(1)
}

const CATALOG = B3_CATALOG

async function polar(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data?.detail ?? data)}`)
  return data
}

const existing = new Map()
let page = 1
for (;;) {
  const list = await polar(`/v1/products/?limit=100&page=${page}`)
  for (const p of list.items || []) {
    const m = p.metadata || {}
    if (m.vy_key && !p.is_archived) existing.set(`${m.vy_key}:${m.vy_interval || ''}`, p)
  }
  if (!list.pagination || page * 100 >= list.pagination.total_count) break
  page++
}

const rows = []
for (const item of CATALOG) {
  const mapKey = catalogMapKey(item)
  let product = existing.get(mapKey)
  // If price or grant differs from B3, archive and recreate.
  const priceAmt = product?.prices?.[0]?.price_amount
  const grantMeta = Number(product?.metadata?.vy_grant_vc)
  const needsRecreate = product && (
    priceAmt !== item.cents || grantMeta !== item.grantVc || product.metadata?.vy_pricing !== 'b3'
  )
  if (needsRecreate) {
    try {
      await polar(`/v1/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_archived: true }),
      })
      console.log(`archived ${item.name.padEnd(18)} ${product.id}`)
    } catch (e) {
      console.warn(`archive failed ${item.name}:`, e.message)
    }
    product = null
  }
  if (product) {
    console.log(`reusing  ${item.name.padEnd(18)} ${product.id}`)
  } else {
    product = await polar('/v1/products/', {
      method: 'POST',
      body: JSON.stringify({
        name: `Vymotion ${item.name}`,
        description: item.kind === 'plan'
          ? `${item.grantVc.toLocaleString('en-US')} credits per billing cycle.`
          : `${item.grantVc.toLocaleString('en-US')} top-up credits (valid 12 months).`,
        recurring_interval: item.interval,
        prices: [{ amount_type: 'fixed', price_amount: item.cents, price_currency: 'usd' }],
        metadata: {
          vy_kind: item.kind, vy_key: item.key, vy_grant_vc: String(item.grantVc),
          vy_pricing: 'b3',
          ...(item.interval ? { vy_interval: item.interval } : {}),
        },
      }),
    })
    console.log(`created  ${item.name.padEnd(18)} ${product.id}`)
  }
  const priceId = product.prices?.[0]?.id ?? null
  rows.push(
    `INSERT OR REPLACE INTO polar_products (polar_product_id, polar_price_id, kind, plan_or_pack, grant_vc, interval, created_at) ` +
    `VALUES ('${product.id}', ${priceId ? `'${priceId}'` : 'NULL'}, '${item.kind}', '${item.key}', ${item.grantVc}, ${item.interval ? `'${item.interval}'` : 'NULL'}, ${Date.now()});`
  )
}

console.log('\n-- Apply to D1:\n')
console.log(rows.join('\n'))
