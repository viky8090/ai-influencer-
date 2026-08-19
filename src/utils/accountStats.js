// Rolls the scattered localStorage records into the handful of numbers the
// profile and account pages show. Everything here is derived — nothing is
// stored — so the counts can never drift out of sync with the real data.

const TEMPLATE_IDS = new Set(['kayla-template', 'camila-template', 'marcus-template'])

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function readPhotoHistory() {
  const list = readJSON('photo_studio_history', [])
  return Array.isArray(list) ? list : []
}

// Videos live inside each influencer's generationHistory rather than a single
// list, so they have to be gathered per influencer.
export function collectVideos(influencers = []) {
  const out = []
  for (const inf of influencers) {
    for (const entry of inf?.generationHistory || []) {
      if (entry?.type === 'video' && entry.url) {
        out.push({ ...entry, influencerId: inf.id, influencerName: inf.name })
      }
    }
  }
  return out.sort((a, b) => (b.date || 0) - (a.date || 0))
}

export function isTemplate(influencer) {
  return TEMPLATE_IDS.has(influencer?.id)
}

export function computeStats(influencers = []) {
  const photos = readPhotoHistory()
  const videos = collectVideos(influencers)
  const own = influencers.filter(i => !isTemplate(i))

  const photosById = new Map()
  for (const p of photos) {
    if (!p?.influencerId) continue
    photosById.set(p.influencerId, (photosById.get(p.influencerId) || 0) + 1)
  }

  const boards = readJSON('inspiration_boards', [])
  const deals = readJSON('brand_deals', [])

  // "Active" is a real signal for a local-first app: which characters have you
  // actually made something with, versus created and abandoned.
  const activeIds = new Set([...photosById.keys(), ...videos.map(v => v.influencerId)])

  const timestamps = [
    ...photos.map(p => p.createdAt),
    ...videos.map(v => v.date),
  ].filter(Boolean)

  return {
    influencerCount: influencers.length,
    createdCount: own.length,
    templateCount: influencers.length - own.length,
    photoCount: photos.length,
    videoCount: videos.length,
    boardCount: Array.isArray(boards) ? boards.length : 0,
    dealCount: Array.isArray(deals) ? deals.length : 0,
    activeCount: influencers.filter(i => activeIds.has(i.id)).length,
    photosById,
    videos,
    lastActivityAt: timestamps.length ? Math.max(...timestamps) : null,
  }
}

// Newest visual we have for an influencer — used for profile card thumbnails.
export function latestImageFor(influencer, photos = readPhotoHistory()) {
  const own = photos
    .filter(p => p.influencerId === influencer?.id && p.url)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return own[0]?.url || influencer?.mainImage || influencer?.characterSheetImage || null
}

export function relativeTime(ts) {
  if (!ts) return null
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}
