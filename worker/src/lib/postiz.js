// Postiz Public API client (PRD N13, §12.8 — social publishing).
// Postiz runs self-hosted + unmodified (AGPL boundary); the Worker is its only caller.
// Env: POSTIZ_API_KEY (secret), POSTIZ_API_BASE (var, e.g. https://postiz.vymotion.org/api/public/v1).
// Raw provider errors stay in the console/D1 — callers surface friendly copy only (§12.7).

export class PostizError extends Error {
  constructor(status, detail) {
    super(`Postiz ${status}: ${detail}`)
    this.name = 'PostizError'
    this.status = status
  }
}

export function isPostizConfigured(env) {
  return Boolean(env.POSTIZ_API_KEY && env.POSTIZ_API_BASE)
}

async function pzFetch(env, path, { method = 'GET', body, retries = 2 } = {}) {
  const url = `${env.POSTIZ_API_BASE}${path}`
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    let res
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: env.POSTIZ_API_KEY,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch (e) {
      lastErr = new PostizError(0, `network: ${String(e?.message || e)}`)
      continue
    }
    if (res.status === 429 || res.status >= 500) {
      const text = await res.text().catch(() => '')
      lastErr = new PostizError(res.status, text.slice(0, 400))
      // Backoff before retrying; 429 respects the instance-wide API_LIMIT.
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      continue
    }
    const text = await res.text()
    let data = null
    try { data = JSON.parse(text) } catch { /* some endpoints return empty/non-JSON bodies */ }
    if (!res.ok) throw new PostizError(res.status, (text || '').slice(0, 400))
    return data
  }
  throw lastErr
}

// ── Integrations (channels) ─────────────────────────────────────────────
export const listIntegrations = (env) => pzFetch(env, '/integrations')

// OAuth authorization URL for connecting a new channel of this platform.
export const getConnectUrl = (env, platform) =>
  pzFetch(env, `/social/${encodeURIComponent(platform)}`)

export const deleteIntegration = (env, id) =>
  pzFetch(env, `/integrations/${encodeURIComponent(id)}`, { method: 'DELETE' })

// Posting rules, max content length, settings schema, tools for a channel.
export const integrationSettings = (env, id) =>
  pzFetch(env, `/integration-settings/${encodeURIComponent(id)}`)

// ── Media ───────────────────────────────────────────────────────────────
// Postiz downloads the file itself → returns MediaFile { id, name, path }.
export const uploadFromUrl = (env, url) =>
  pzFetch(env, '/upload-from-url', { method: 'POST', body: { url } })

// ── Posts ───────────────────────────────────────────────────────────────
// payload per docs: { type: draft|schedule|now, date, shortLink, tags, posts: [...] }
// → [{ postId, integration }]
export const createPost = (env, payload) =>
  pzFetch(env, '/posts', { method: 'POST', body: payload, retries: 0 }) // never double-post on retry

export const listPosts = (env, startDateIso, endDateIso) =>
  pzFetch(env, `/posts?startDate=${encodeURIComponent(startDateIso)}&endDate=${encodeURIComponent(endDateIso)}`)

export const changePostStatus = (env, id, status) =>
  pzFetch(env, `/posts/${encodeURIComponent(id)}/status`, { method: 'PUT', body: { status } })

// 404 = already deleted (treated as success by callers).
export const deletePost = (env, id) =>
  pzFetch(env, `/posts/${encodeURIComponent(id)}`, { method: 'DELETE' })
