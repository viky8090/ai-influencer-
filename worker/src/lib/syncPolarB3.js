// Sync B3 pricing to Polar + D1 polar_products.
// Creates fresh Polar products (archives old ones with matching vy_key metadata) so
// checkout charges the new dollar amounts and webhooks grant the new VC totals.
import { B3_CATALOG, catalogMapKey, catalogGroupKey } from './polarCatalog.js'

async function polarFetch(env, path, { method = 'GET', body } = {}) {
  const base = env.POLAR_API_BASE || 'https://api.polar.sh'
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.POLAR_ACCESS_TOKEN}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch { /* */ }
  if (!res.ok) {
    const detail = data ? JSON.stringify(data.detail ?? data.error ?? data) : text
    throw new Error(`Polar ${res.status}: ${String(detail).slice(0, 400)}`)
  }
  return data
}

async function listAllProducts(env) {
  const out = []
  let page = 1
  for (;;) {
    const list = await polarFetch(env, `/v1/products/?limit=100&page=${page}`)
    for (const p of list.items || []) out.push(p)
    if (!list.pagination || page * 100 >= list.pagination.total_count) break
    page++
  }
  return out
}

async function archiveProduct(env, productId) {
  try {
    // Prefer archive if supported; fall back to is_archived patch.
    await polarFetch(env, `/v1/products/${productId}`, {
      method: 'PATCH',
      body: { is_archived: true },
    })
    return 'archived'
  } catch (e) {
    return `archive_failed:${e.message}`
  }
}

/**
 * @returns {{ ok: true, results: Array<object> } | { ok: false, error: string }}
 */
export async function syncPolarB3(env) {
  if (!env.POLAR_ACCESS_TOKEN) return { ok: false, error: 'polar_not_configured' }

  const existing = await listAllProducts(env)
  // Two lookups: exact tier (key:interval:grantVc — current metadata shape) and legacy
  // pre-tier products (key:interval only) so a re-run archives whichever shape is live.
  const byKey = new Map()
  const byLegacyKey = new Map()
  for (const p of existing) {
    const m = p.metadata || {}
    if (!m.vy_key) continue
    byLegacyKey.set(`${m.vy_key}:${m.vy_interval || ''}`, p)
    if (m.vy_grant_vc) byKey.set(`${m.vy_key}:${m.vy_interval || ''}:${m.vy_grant_vc}`, p)
  }

  const results = []
  const ts = Date.now()
  const clearedGroups = new Set() // clear each plan/pack group's stale D1 rows once per run

  for (const item of B3_CATALOG) {
    const mapKey = catalogMapKey(item)
    // Exact tier match first; base tiers also match their legacy (pre-tier) product.
    const old = byKey.get(mapKey) || byLegacyKey.get(`${item.key}:${item.interval || ''}`)
    let archived = null
    if (old && !old.is_archived) {
      archived = await archiveProduct(env, old.id)
      old.is_archived = true // a legacy product can match several tiers — archive once
    }

    const product = await polarFetch(env, '/v1/products/', {
      method: 'POST',
      body: {
        name: `Vymotion ${item.name}`,
        description: item.kind === 'plan'
          ? `${item.grantVc.toLocaleString('en-US')} credits per billing cycle.`
          : `${item.grantVc.toLocaleString('en-US')} top-up credits (valid 12 months).`,
        recurring_interval: item.interval || undefined,
        prices: [{ amount_type: 'fixed', price_amount: item.cents, price_currency: 'usd' }],
        metadata: {
          vy_kind: item.kind,
          vy_key: item.key,
          vy_grant_vc: String(item.grantVc),
          vy_pricing: 'b3',
          ...(item.interval ? { vy_interval: item.interval } : {}),
        },
      },
    })

    const priceId = product.prices?.[0]?.id ?? null

    // Drop stale rows for this plan/pack+interval on FIRST touch only — the old per-item
    // delete wiped sibling tiers inserted moments earlier in the same run. Deleting lazily
    // (after the Polar create succeeded) keeps checkout alive for untouched groups if the
    // sync dies midway.
    const group = catalogGroupKey(item)
    if (!clearedGroups.has(group)) {
      clearedGroups.add(group)
      if (item.interval) {
        await env.DB.prepare(
          `DELETE FROM polar_products WHERE kind = ? AND plan_or_pack = ? AND interval = ?`
        ).bind(item.kind, item.key, item.interval).run()
      } else {
        await env.DB.prepare(
          `DELETE FROM polar_products WHERE kind = ? AND plan_or_pack = ? AND interval IS NULL`
        ).bind(item.kind, item.key).run()
      }
    }

    await env.DB.prepare(
      `INSERT INTO polar_products
         (polar_product_id, polar_price_id, kind, plan_or_pack, grant_vc, interval, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      product.id,
      priceId,
      item.kind,
      item.key,
      item.grantVc,
      item.interval,
      ts,
    ).run()

    results.push({
      key: mapKey,
      grantVc: item.grantVc,
      cents: item.cents,
      productId: product.id,
      priceId,
      oldProductId: old?.id || null,
      archived,
    })
  }

  return { ok: true, count: results.length, results }
}
