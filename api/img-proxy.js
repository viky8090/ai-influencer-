export default async function handler(req, res) {
  const { url, name } = req.query
  if (!url) { res.status(400).send('Missing url'); return }

  try {
    const upstream = await fetch(decodeURIComponent(url))
    if (!upstream.ok) { res.status(upstream.status).send('Upstream error'); return }

    const ct = upstream.headers.get('content-type') || 'image/jpeg'
    const buf = await upstream.arrayBuffer()
    const filename = name ? decodeURIComponent(name) : 'image.jpg'

    res.setHeader('Content-Type', ct)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.end(Buffer.from(buf))
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message)
  }
}
