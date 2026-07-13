// Plan policy — single source for gates (publish, premium models, paid checks).

export const PAID_PLANS = ['starter', 'creator', 'pro', 'studio']
export const PUBLISH_PLANS = PAID_PLANS

// Premium video COGS (Seedance 2 / Veo) — Creator+ only.
export const PREMIUM_VIDEO_MODELS = new Set(['seedance_2_0', 'veo_3_fast'])
export const PREMIUM_VIDEO_PLANS = new Set(['creator', 'pro', 'studio'])

export function isPaidPlan(plan) {
  return PAID_PLANS.includes(plan)
}

export function canPublish(plan) {
  return PUBLISH_PLANS.includes(plan)
}

export function canUsePremiumVideo(plan) {
  return PREMIUM_VIDEO_PLANS.has(plan)
}

/** Active subscription plan key, or 'free'. */
export async function getActivePlan(env, userId) {
  const sub = await env.DB.prepare(
    `SELECT plan FROM subscriptions
     WHERE user_id = ? AND status IN ('active','past_due')
       AND plan IN ('starter','creator','pro','studio')
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(userId).first()
  return sub?.plan || 'free'
}
