// Stream an R2 object as an HTTP media response with the headers browsers need to load it
// efficiently. The original handlers returned bare 200s: no Content-Length, no ETag, no
// Range support, no edge caching. That forced <video preload="metadata"> to download the
// ENTIRE mp4 just to paint a first frame (browsers probe the moov atom with Range requests,
// and a 200-without-Content-Length also hides duration and disables seeking), and every
// image view paid a D1 lookup + full R2 read because Worker responses are never edge-cached
// automatically.
//
// What this provides:
// - Range → 206 partials served directly from R2 (video scrubbing, metadata probes)
// - Content-Length + ETag → duration/progress display and 304 revalidation
// - edgeCache → caches.default at the visitor's colo. Cloudflare serves 206/304 slices out
//   of a cached FULL response by itself (it honors Range / If-None-Match when the cached
//   response carries Content-Length / ETag), so we only ever cache complete 200s.
//   NEVER set edgeCache on authenticated per-user responses — the cache is shared.
//   (No-op on *.workers.dev; production traffic is same-zone via vymotion.org.)

export async function serveR2Media(c, r2Key, contentType, { cacheControl, edgeCache = false, cors = false } = {}) {
  const cache = edgeCache ? caches.default : null

  if (cache) {
    const hit = await cache.match(c.req.raw).catch(() => null)
    if (hit) return hit
  }

  const reqHeaders = c.req.raw.headers
  let obj = null
  try {
    obj = await c.env.ASSETS.get(r2Key, reqHeaders.has('range') ? { range: reqHeaders } : undefined)
  } catch {
    obj = await c.env.ASSETS.get(r2Key) // malformed/unsatisfiable Range → serve full
  }
  if (!obj) return c.json({ error: 'gone' }, 404)

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'Accept-Ranges': 'bytes',
    ETag: obj.httpEtag,
    'X-Content-Type-Options': 'nosniff',
    ...(cors ? { 'Access-Control-Allow-Origin': '*' } : {}),
  })

  // Cloudflare's edge injects `Range: bytes=0-` on cacheable requests it wants to stream —
  // honoring that with a 206 spanning the whole object breaks browsers: the fetch spec
  // rejects a 206 when the CLIENT never sent Range (anti range-splicing). So a range that
  // covers the entire object falls through to the plain 200 path below.
  const wholeObject = obj.range &&
    ('suffix' in obj.range ? obj.range.suffix >= obj.size
      : (obj.range.offset ?? 0) === 0 && (obj.range.length ?? obj.size) >= obj.size)

  if (obj.range && !wholeObject) {
    const start = 'suffix' in obj.range ? obj.size - obj.range.suffix : (obj.range.offset ?? 0)
    const length = 'suffix' in obj.range ? obj.range.suffix : (obj.range.length ?? obj.size - start)
    headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${obj.size}`)
    headers.set('Content-Length', String(length))
    if (cache) {
      // Cold ranged hit: warm the edge with the full object in the background so every
      // subsequent Range request on this colo is sliced from cache instead of hitting R2.
      c.executionCtx.waitUntil((async () => {
        const full = await c.env.ASSETS.get(r2Key)
        if (!full) return
        const fullHeaders = new Headers(headers)
        fullHeaders.delete('Content-Range')
        fullHeaders.set('Content-Length', String(full.size))
        await cache.put(new Request(c.req.url), new Response(full.body, { status: 200, headers: fullHeaders }))
      })().catch(() => {}))
    }
    return new Response(obj.body, { status: 206, headers })
  }

  headers.set('Content-Length', String(obj.size))
  const res = new Response(obj.body, { status: 200, headers })
  if (cache) c.executionCtx.waitUntil(cache.put(new Request(c.req.url), res.clone()).catch(() => {}))
  return res
}
