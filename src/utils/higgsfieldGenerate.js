import { getHFToken } from './higgsfieldAuth'

const MCP_URL = '/api/hf/mcp'

let _sessionId = null

async function mcpPost(body) {
  const token = getHFToken()
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${token}`,
  }
  if (_sessionId) headers['Mcp-Session-Id'] = _sessionId

  const res = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) })

  if (res.status === 401) throw new Error('Higgsfield session expired — please reconnect in Settings')
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Higgsfield API error ${res.status}: ${errText}`)
  }

  const sid = res.headers.get('Mcp-Session-Id')
  if (sid) _sessionId = sid

  const ct = res.headers.get('content-type') || ''
  const rawText = await res.text()
  console.log('[HF] raw body:', rawText.slice(0, 600))

  if (ct.includes('text/event-stream') || rawText.trimStart().startsWith('data:')) {
    return parseSSEText(rawText)
  }
  try { return JSON.parse(rawText) } catch { return rawText }
}

function parseSSEText(text) {
  let last = null
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const raw = trimmed.slice(5).trim()
    if (!raw || raw === '[DONE]') continue
    try { const d = JSON.parse(raw); if (d !== null) last = d } catch {}
  }
  return last
}

async function initSession() {
  _sessionId = null
  await mcpPost({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'AI Influencer Studio', version: '1.0' },
    },
  })
}

async function callTool(name, args) {
  const res = await mcpPost({
    jsonrpc: '2.0', id: Date.now(), method: 'tools/call',
    params: { name, arguments: args },
  })
  const result = res?.result ?? res
  console.log(`[HF] callTool(${name}) =>`, JSON.stringify(result)?.slice(0, 500))
  return result
}

function unwrapMCP(result) {
  if (!result?.content) return result
  for (const item of result.content) {
    if (item.text) {
      try { return JSON.parse(item.text) } catch { return item.text }
    }
  }
  return result
}

function extractJobIds(result) {
  const data = unwrapMCP(result)

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data.results)) {
      const ids = data.results.map(r => r?.id || r?.job_id).filter(id => id?.length >= 8)
      if (ids.length) return ids
    }
    if (data.job_id) return [data.job_id]
    if (data.jobId) return [data.jobId]
    if (typeof data.id === 'string' && data.id.length >= 8) return [data.id]
  }

  // Plain-text response: extract UUIDs embedded in the description
  const str = typeof data === 'string' ? data : JSON.stringify(data ?? '')
  const uuids = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []
  console.log('[HF] extracted UUIDs from text:', uuids)
  return [...new Set(uuids)]
}

function extractImageUrls(result) {
  const data = unwrapMCP(result)

  // Structured: results[].results.rawUrl  (job_display format)
  if (Array.isArray(data?.results)) {
    const urls = data.results
      .map(r => r?.results?.rawUrl || r?.results?.minUrl || r?.result_url)
      .filter(Boolean)
    if (urls.length) return [...new Set(urls)]
  }

  // Fallback: regex scan for any https image URL
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  const raw = str.match(/https:\/\/[^\s"\\]+\.(?:jpg|jpeg|png|webp)(?:[^\s"\\]*)?/g) || []
  return [...new Set(raw.map(u => u.replace(/[\\}"']+$/, '')))]
}

function countTerminalJobs(result) {
  const data = unwrapMCP(result)
  if (!Array.isArray(data?.results)) return 0
  return data.results.filter(r => {
    if (r?.results?.rawUrl || r?.results?.minUrl || r?.result_url) return true
    const s = (r?.status || r?.job_status || '').toLowerCase()
    return ['done', 'completed', 'failed', 'error', 'nsfw', 'content_filtered', 'rejected', 'cancelled'].includes(s)
  }).length
}

// Poll all jobs together in one job_display call.
async function pollAllJobs(jobIds, onProgress) {
  let lastResponse = null
  let lastUrlCount = 0
  let stalePolls = 0

  for (let i = 0; i < 100; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 2500))
    try {
      const display = await callTool('job_display', { ids: jobIds })
      lastResponse = display
      const urls = extractImageUrls(display)
      const terminal = countTerminalJobs(display)
      console.log(`[HF] poll ${i} → ${urls.length} URLs, ${terminal}/${jobIds.length} terminal, stale=${stalePolls}`)
      onProgress?.(Math.min(22 + (urls.length / jobIds.length) * 73, 95))

      if (urls.length >= jobIds.length) return urls
      // All jobs in a terminal state — return whatever succeeded
      if (terminal >= jobIds.length && urls.length > 0) return urls

      // Stale check: if we have ≥1 URL but count hasn't grown for 6 polls (~15s), the rest likely failed
      if (urls.length > lastUrlCount) { lastUrlCount = urls.length; stalePolls = 0 }
      else if (urls.length > 0) stalePolls++
      if (stalePolls >= 6) {
        console.warn('[HF] stale — returning partial results')
        return urls
      }
    } catch (e) {
      console.warn(`[HF] poll ${i} error:`, e.message)
    }
  }

  const partialUrls = lastResponse ? extractImageUrls(lastResponse) : []
  if (partialUrls.length > 0) return partialUrls
  console.error('[HF] timed out. Last display response:', JSON.stringify(lastResponse)?.slice(0, 400))
  throw new Error('Generation timed out — check browser console for details')
}

async function uploadRefImage(dataUrl) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const contentType = blob.type || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpeg'
  const filename = `ref_${Date.now()}.${ext}`

  const uploadResult = await callTool('media_upload', { method: 'upload_url', filename, content_type: contentType })
  const uploadData = unwrapMCP(uploadResult)
  console.log('[HF] media_upload raw:', JSON.stringify(uploadData)?.slice(0, 500))

  let uploadUrl = uploadData?.upload_url || uploadData?.url
  let mediaId = uploadData?.media_id || uploadData?.id

  // Response is plain text (curl instructions) — extract via regex
  if (!uploadUrl || !mediaId) {
    const text = typeof uploadData === 'string' ? uploadData : JSON.stringify(uploadData ?? '')
    const uuids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []
    if (uuids.length) mediaId = uuids[0]
    const urlMatch = text.match(/https:\/\/[^\s"'\\]+/)
    if (urlMatch) uploadUrl = urlMatch[0]
  }

  if (!uploadUrl || !mediaId) throw new Error(`media_upload: could not extract upload_url/media_id from response`)

  const putRes = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': contentType } })
  if (!putRes.ok) throw new Error(`Reference image upload failed: ${putRes.status}`)

  const confirmResult = await callTool('media_confirm', { media_id: mediaId, type: 'image' })
  const confirmed = unwrapMCP(confirmResult)
  console.log('[HF] media_confirm raw:', JSON.stringify(confirmed)?.slice(0, 500))

  // Structured response
  const cdnUrl = confirmed?.url || confirmed?.media_url || confirmed?.rawUrl || confirmed?.cdn_url
  if (cdnUrl) return cdnUrl

  // Text response — extract URL or fall back to media_id
  if (typeof confirmed === 'string') {
    const urlMatch = confirmed.match(/https:\/\/[^\s"'\\]+/)
    if (urlMatch) return urlMatch[0]
  }

  return confirmed?.media_id || confirmed?.id || mediaId
}

export async function generateThreeImages({ prompts, aspectRatio = '9:16', faceRef = null, styleRef = null, onProgress }) {
  await initSession()
  onProgress?.(5)

  const medias = []
  let refInstruction = ''

  if (faceRef) {
    console.log('[HF] uploading face reference...')
    medias.push({ value: await uploadRefImage(faceRef), role: 'image' })
    onProgress?.(12)
  }
  if (styleRef) {
    console.log('[HF] uploading style reference...')
    medias.push({ value: await uploadRefImage(styleRef), role: 'image' })
    onProgress?.(15)
  }

  if (faceRef && styleRef) {
    refInstruction = ' @image1 is a structural geometry reference only — extract only the abstract spatial proportions between features (eye spacing, jaw width, nose length ratio). The written description above is the sole authority on this person\'s ethnicity, skin tone, hair color and texture, eye shape, and every identity attribute — these must come entirely from the text, not from @image1. Do not transfer any racial, ethnic, or identity characteristics from @image1. Ignore @image1\'s clothing, background, and photographic style entirely. @image2 is a visual style reference — match the aesthetic, color palette, and mood of @image2.'
  } else if (faceRef) {
    refInstruction = ' @image1 is a structural geometry reference only — extract only the abstract spatial proportions between features (eye spacing, jaw width, nose length ratio). The written description above is the sole authority on this person\'s ethnicity, skin tone, hair color and texture, eye shape, and every identity attribute — these must come entirely from the text, not from @image1. Do not transfer any racial, ethnic, or identity characteristics from @image1. Ignore @image1\'s clothing, background, and photographic style entirely.'
  } else if (styleRef) {
    refInstruction = ' @image1 is a visual style reference — match the aesthetic, color palette, lighting, and mood of @image1. Do not copy the appearance of any person in @image1.'
  }

  const baseParams = { model: 'gpt_image_2', aspect_ratio: aspectRatio, count: 1, quality: 'high', resolution: '2k' }
  if (medias.length) baseParams.medias = medias

  const launchResults = await Promise.all(
    prompts.map(prompt => callTool('generate_image', { params: { ...baseParams, prompt: prompt + refInstruction } }))
  )
  onProgress?.(22)

  const allDirectUrls = launchResults.flatMap(r => extractImageUrls(r))
  if (allDirectUrls.length >= prompts.length) {
    onProgress?.(100)
    return allDirectUrls.slice(0, prompts.length)
  }

  const allJobIds = launchResults.flatMap(r => extractJobIds(r))
  console.log('[HF] three-image job IDs:', allJobIds)
  if (!allJobIds.length) {
    throw new Error(`No job IDs found. Response: ${JSON.stringify(launchResults).slice(0, 300)}`)
  }

  const urls = await pollAllJobs(allJobIds, onProgress)
  onProgress?.(100)
  return urls
}

export async function generateImages({ prompt, count = 3, aspectRatio = '9:16', referenceImage = null, onProgress }) {
  await initSession()
  onProgress?.(10)

  const params = { model: 'gpt_image_2', prompt, aspect_ratio: aspectRatio, count, quality: 'high', resolution: '2k' }
  if (referenceImage && referenceImage.startsWith('http')) {
    params.medias = [{ value: referenceImage, role: 'image' }]
  }

  const result = await callTool('generate_image', { params })
  onProgress?.(20)

  const directUrls = extractImageUrls(result)
  if (directUrls.length > 0) { onProgress?.(100); return directUrls }

  const jobIds = extractJobIds(result)
  console.log('[HF] job IDs to poll:', jobIds)
  if (!jobIds.length) {
    throw new Error(`No job IDs found. Response: ${JSON.stringify(unwrapMCP(result))?.slice(0, 300)}`)
  }

  const allUrls = await pollAllJobs(jobIds, onProgress)
  onProgress?.(100)
  return allUrls
}
