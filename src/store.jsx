import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { useAuth } from '@clerk/react'
import { api } from './api/client'

// Generic small-value localStorage hook (inspiration boards, brand deals, etc.)
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('localStorage quota exceeded — data not saved', e)
    }
  }, [key, value])

  return [value, setValue]
}

// ── Per-influencer storage ────────────────────────────────────────
// Each influencer lives in its own key: hf_influencer_${id}
// The ordered list of IDs lives in influencer_ids.
// This way adding/updating influencer N never risks losing influencer M.

const INF_PREFIX = 'hf_influencer_'
const IDS_KEY    = 'influencer_ids'

// Former multi-demo seed IDs — removed for ship (Camila only). User-created influencers are kept.
const REMOVED_DEMO_IDS = new Set([
  'kayla-template',
  'marcus-template',
  'mpe00fxqdypgtihqft',
  'mpm5hc0xi4d78ry3qr',
  'mpm8eqj77o69r06igss',
  'mpma2ne5wzlwy87k7n',
  'mpmd4rw1nhdryivbpxh',
  'mpdvj953buyeu0n2ddm',
])

function readInfluencer(id) {
  try { return JSON.parse(localStorage.getItem(`${INF_PREFIX}${id}`)) } catch { return null }
}

function writeInfluencer(inf) {
  try {
    localStorage.setItem(`${INF_PREFIX}${inf.id}`, JSON.stringify(inf))
    return true
  } catch (e) {
    console.warn(`localStorage quota exceeded — influencer "${inf.name}" not saved`, e)
    return false
  }
}

function readIds() {
  try { return JSON.parse(localStorage.getItem(IDS_KEY) || 'null') } catch { return null }
}

function writeIds(ids) {
  try { localStorage.setItem(IDS_KEY, JSON.stringify(ids)) } catch {}
}

// Read the legacy single-key list (may still have data even after migration attempt)
function readLegacyList() {
  try {
    const raw = localStorage.getItem('influencers')
    if (!raw) return []
    return JSON.parse(raw) || []
  } catch { return [] }
}

/**
 * Repair records that point at bundled sample media by its old filename.
 *
 * The bundled Camila media was re-encoded from PNG to WebP, and the PNG files were removed.
 * Records already in localStorage still referenced the old names, and because the seed only
 * populates generationHistory when it is empty, a returning user kept those dead paths and
 * saw broken tiles in the library. Nothing was wrong with the page - the URLs pointed at
 * files that no longer existed.
 *
 * The rewrite is deliberately narrow: only /camila/* and /inf/* .png, which is exactly the
 * set that was converted (verified: zero PNGs remain under either directory). User-generated
 * URLs live on remote hosts and never match. Walking the record generically rather than
 * naming fields means it also catches media nested in wardrobeSlots, brandDeals, homeSlots
 * and generationHistory without having to enumerate them.
 */
const MEDIA_WEBP_MIGRATION_KEY = 'vy_media_webp_migrated_v1'
const BUNDLED_PNG = /^(\/(?:camila|inf)\/[^?#]*)\.png$/i

function rewriteBundledPaths(node) {
  if (typeof node === 'string') return node.replace(BUNDLED_PNG, '$1.webp')
  if (Array.isArray(node)) return node.map(rewriteBundledPaths)
  if (node && typeof node === 'object') {
    const out = {}
    for (const k of Object.keys(node)) out[k] = rewriteBundledPaths(node[k])
    return out
  }
  return node
}

function migrateBundledMediaPaths() {
  try {
    if (localStorage.getItem(MEDIA_WEBP_MIGRATION_KEY)) return
    for (const id of readIds() || []) {
      const inf = readInfluencer(id)
      if (!inf) continue
      const next = rewriteBundledPaths(inf)
      if (JSON.stringify(next) !== JSON.stringify(inf)) writeInfluencer(next)
    }
    for (const key of ['photo_studio_history', 'influencers']) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const fixed = JSON.stringify(rewriteBundledPaths(JSON.parse(raw)))
      if (fixed !== raw) localStorage.setItem(key, fixed)
    }
    localStorage.setItem(MEDIA_WEBP_MIGRATION_KEY, '1')
  } catch (e) {
    // A failed migration must never block boot - the media component degrades gracefully.
    console.warn('bundled media path migration skipped:', e)
  }
}

// One-time ship cutover: wipe every influencer except Camila (demo seed).
// After this flag is set, newly created influencers are kept normally.
const SHIP_CAMILA_ONLY_KEY = 'vy_ship_camila_only_v2'
const SHIP_SERVER_PRUNED_KEY = 'vy_ship_server_pruned_v2'

function filterShipRoster(list) {
  // Drop retired multi-demo seeds; always keep Camila + any user-created influencers
  return (list || []).filter(inf => inf && !REMOVED_DEMO_IDS.has(inf.id))
}

function pruneLocalToCamilaOnly() {
  const keep = { ...CAMILA_SEED }
  const existing = readInfluencer('camila-template')
  // Prefer richer existing Camila if present
  const camila = existing?.id === 'camila-template'
    ? {
        ...CAMILA_SEED,
        ...existing,
        mainImage: existing.mainImage || CAMILA_SEED.mainImage,
        characterSheetImage: existing.characterSheetImage || CAMILA_SEED.characterSheetImage,
        closeUpImage1: existing.closeUpImage1 || CAMILA_SEED.closeUpImage1,
        closeUpImage2: existing.closeUpImage2 || CAMILA_SEED.closeUpImage2,
        wardrobeSlots: existing.wardrobeSlots?.length ? existing.wardrobeSlots : CAMILA_SEED.wardrobeSlots,
        brandDeals: existing.brandDeals?.length ? existing.brandDeals : CAMILA_SEED.brandDeals,
        generationHistory: existing.generationHistory?.length ? existing.generationHistory : CAMILA_SEED.generationHistory,
      }
    : keep

  // Remove every per-influencer key
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(INF_PREFIX)) {
      try { localStorage.removeItem(key) } catch {}
    }
  }
  try { localStorage.removeItem('influencers') } catch {} // legacy list

  writeInfluencer(camila)
  writeIds(['camila-template'])

  // Photo history: Camila samples only
  try {
    const existing = JSON.parse(localStorage.getItem('photo_studio_history') || '[]')
    const camilaOnly = existing.filter(e =>
      e.influencerId === 'camila-template'
      || e.influencerName === 'Camila'
      || (typeof e.url === 'string' && e.url.includes('/camila/'))
    )
    localStorage.setItem('photo_studio_history', JSON.stringify(camilaOnly))
    window.dispatchEvent?.(new CustomEvent('photo_studio_history_updated'))
  } catch {}

  return camila
}

function useInfluencerStore(initial) {
  const [influencers, setInfluencers] = useState(() => {
    const ids = readIds()
    if (ids && ids.length > 0) {
      const loaded = ids.map(readInfluencer).filter(Boolean)

      // If we loaded fewer than expected, some hf_influencer_* writes failed (quota).
      // Recover missing ones from the legacy 'influencers' key which may still have the data.
      if (loaded.length < ids.length) {
        const loadedSet = new Set(loaded.map(i => i.id))
        const legacy = readLegacyList()
        for (const inf of legacy) {
          if (!loadedSet.has(inf.id) && !REMOVED_DEMO_IDS.has(inf.id)) {
            loaded.push(inf)
            loadedSet.add(inf.id)
          }
        }
        // Restore original order
        const byId = Object.fromEntries(loaded.map(i => [i.id, i]))
        const ordered = filterShipRoster(ids.map(id => byId[id]).filter(Boolean))
        // Also pick up any influencers in legacy but not in ids (edge case)
        const orderedSet = new Set(ordered.map(i => i.id))
        for (const inf of legacy) {
          if (!orderedSet.has(inf.id) && !REMOVED_DEMO_IDS.has(inf.id)) ordered.push(inf)
        }
        return ordered.length > 0 ? ordered : initial
      }

      const filtered = filterShipRoster(loaded)
      return filtered.length > 0 ? filtered : initial
    }

    // No new-format IDs yet — fall back to legacy single key
    const legacy = filterShipRoster(readLegacyList())
    return legacy.length > 0 ? legacy : initial
  })

  // Hybrid persistence: signed-out keeps the localStorage path below entirely unchanged;
  // signed-in users additionally load from / save to the server (D1) via the API.
  const { isLoaded, isSignedIn } = useAuth()
  const sourceRef = useRef('local')          // flips to 'server' after a successful server load
  const lastServerSnapshot = useRef(null)
  const influencersRef = useRef(influencers)
  influencersRef.current = influencers

  useEffect(() => {
    const ids = influencers.map(i => i.id)
    writeIds(ids)
    for (const inf of influencers) writeInfluencer(inf)
    // Remove keys for deleted influencers
    const idSet = new Set(ids)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(INF_PREFIX)) {
        const id = key.slice(INF_PREFIX.length)
        if (!idSet.has(id)) try { localStorage.removeItem(key) } catch {}
      }
    }
  }, [influencers])

  // On sign-in: hydrate from the server. If the server is empty (first sign-in), import the
  // current local influencers (seeds + anything created offline) so nothing is lost (FR-D6).
  // Ship cutover: once, replace server roster with Camila-only so old test personas (e.g. "viky")
  // don't reappear after local prune.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    api.influencers.list()
      .then(async ({ influencers: serverList }) => {
        if (!alive) return

        const shipLocal = localStorage.getItem(SHIP_CAMILA_ONLY_KEY) === '1'
        const serverPruned = localStorage.getItem(SHIP_SERVER_PRUNED_KEY) === '1'

        // One-time: push Camila-only roster to the server, ignore legacy server list
        if (shipLocal && !serverPruned) {
          const camila = readInfluencer('camila-template') || CAMILA_SEED
          const shipList = [camila]
          lastServerSnapshot.current = null
          sourceRef.current = 'server'
          setInfluencers(shipList)
          await api.influencers.saveAll(shipList).catch(() => {})
          try { localStorage.setItem(SHIP_SERVER_PRUNED_KEY, '1') } catch {}
          return
        }

        if (serverList && serverList.length) {
          const cleaned = filterShipRoster(serverList)
          // Always keep Camila available if missing from server
          if (!cleaned.some(i => i.id === 'camila-template')) {
            cleaned.unshift(readInfluencer('camila-template') || CAMILA_SEED)
          }
          lastServerSnapshot.current = cleaned
          sourceRef.current = 'server'
          setInfluencers(cleaned)
        } else {
          const local = influencersRef.current
          if (local && local.length) await api.influencers.saveAll(local).catch(() => {})
          sourceRef.current = 'server'
        }
      })
      .catch(() => { /* stay on localStorage; retried on next sign-in */ })
    return () => { alive = false }
  }, [isLoaded, isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // When server-backed, mirror changes to the server (debounced). The localStorage write
  // effect above still runs too, keeping a warm offline cache.
  useEffect(() => {
    if (sourceRef.current !== 'server') return
    if (influencers === lastServerSnapshot.current) return // just hydrated — don't echo back
    const t = setTimeout(() => { api.influencers.saveAll(influencers).catch(() => {}) }, 700)
    return () => clearTimeout(t)
  }, [influencers])

  return [influencers, setInfluencers]
}

// ── Shared contexts — one source of truth across all pages ──
const InfluencersCtx = createContext(null)
const InspirationCtx = createContext(null)
const BrandDealsCtx  = createContext(null)

// Ship version: only Camila is the demo example for first-time users.
// Other former demo templates (Kayla, Marcus, Brad, …) are stripped on migrate.
const CAMILA_SEED = {
  id: 'camila-template',
  name: 'Camila',
  gender: 'Female',
  type: 'Influencer',
  createdAt: 1715000001000,
  mainImage: '/camila/main.jpg',
  characterSheetImage: '/camila/sheet.jpg',
  closeUpImage1: '/camila/closeup1.webp',
  closeUpImage2: '/camila/closeup2.webp',
  prompt: 'Candid iPhone photo of @image1, wearing the complete outfit from @image2, reproducing all clothing, headwear, and accessories exactly. Match skin texture and facial detail from @image3 and @image4. Mid-action — mid-laugh, mid-sip, mid-step, or mid-reach — body fully committed to the action, expression caught at the apex. Eyes can be on lens (late-arrival) or completely off-axis. Hands engaged with the action, not posed. Expression: direct and serious — neutral mouth at rest, steady gaze into the lens, no smile. Composed and self-assured. Eyes directed off-axis — looking to the side or slightly above the camera, as if unaware of being photographed. A small front window table, street traffic soft and blurred outside the glass, a half-drunk flat white on the table beside her. Soft morning window light from one side, cool and directional. Eye-level, 24mm, handheld. 9:16, chest-up framing. Deep focus, no bokeh, photorealistic. No other people in frame.',
  age: '22',
  backstory: "Camilla got into fitness relatively young, but after realizing she wasn't passionate in personal training clients in the gym, she switched careers to teaching yoga classes.",
  introExtrovert: 70,
  niche: 'Fashion',
  nicheCustom: '',
  audience: '',
  hobbies: '',
  clothingStyle: 'Streetwear',
  dreamBrands: '',
  voice: '',
  contentPillars: [],
  palette: ['#D97706', '#FDE68A', '#B45309', '#92400E'],
  videoUrls: [],
  scripts: [],
  homeImages: [],
  brandDealImages: [],
  wardrobeSlots: [
    { id: 'camila-wardrobe-sporty', name: 'sporty fit', image: '/camila/wardrobe/sporty_fit.webp' },
    { id: 'camila-wardrobe-yoga',   name: 'yoga fit',   image: '/camila/wardrobe/yoga_fit.webp'   },
  ],
  brandDeals: [
    { id: 'camila-deal-swatch', brand: 'swatch', category: 'fashion', image: '/camila/brand_deals/swatch_original.webp', images: ['/camila/brand_deals/swatch_original.webp'], characterSheet: '/camila/brand_deals/swatch_sheet.webp' },
  ],
  physicalDesc: 'Latina, medium-length wavy brunette hair with side-swept bangs, brown eyes, olive skin tone, slim athletic build',
  generationHistory: [
    { id: 'camila-video-1', type: 'video', label: 'Video', url: '/camila/videos/v1.mp4', date: 1748177579000 },
    { id: 'camila-video-2', type: 'video', label: 'Video', url: '/camila/videos/v2.mp4', date: 1748213180000 },
    { id: 'camila-video-3', type: 'video', label: 'Video', url: '/camila/videos/v3.mp4', date: 1748216854000 },
    { id: 'camila-video-4', type: 'video', label: 'Video', url: '/camila/videos/v4.mp4', date: 1748208318000 },
  ],
}

// ── Sync startup block ────────────────────────────────────────────
// Runs before React renders. Ship version: Camila is the only demo seed.

// Step 1: Free quota by stripping base64 product refs from video history
try {
  const histKeys = Object.keys(localStorage).filter(k => k.startsWith('hf_video_history_'))
  for (const key of histKeys) {
    const raw = JSON.parse(localStorage.getItem(key) || '[]')
    if (raw.some(e => e.productRef1 || e.productRef2 || e.productRef3)) {
      const cleaned = raw.map(e => { const c = { ...e }; delete c.productRef1; delete c.productRef2; delete c.productRef3; return c })
      try { localStorage.setItem(key, JSON.stringify(cleaned)) } catch { localStorage.removeItem(key) }
    }
  }
} catch (_) {}

// Step 1b: Repair bundled sample media whose filenames changed under existing records.
// Runs before the seed step so the Camila record is already correct by the time the seed
// decides whether to leave the stored generationHistory alone.
migrateBundledMediaPaths()

// Step 2: Ship cutover — local roster is Camila only (one-time), then normal ops
try {
  if (!localStorage.getItem(SHIP_CAMILA_ONLY_KEY)) {
    pruneLocalToCamilaOnly()
    localStorage.setItem(SHIP_CAMILA_ONLY_KEY, '1')
    // Force re-prune server on next sign-in
    try { localStorage.removeItem(SHIP_SERVER_PRUNED_KEY) } catch {}
  } else {
    // Ensure Camila always exists for returning users
    const ids = readIds() || []
    if (!ids.includes('camila-template') || !readInfluencer('camila-template')) {
      writeInfluencer(CAMILA_SEED)
      writeIds(['camila-template', ...ids.filter(id => id !== 'camila-template')])
    } else {
      // Patch missing Camila seed fields
      const existing = readInfluencer('camila-template')
      if (existing) {
        const existingWardrobeIds = new Set((existing.wardrobeSlots || []).map(s => s.id))
        const missingWardrobe = CAMILA_SEED.wardrobeSlots.filter(s => !existingWardrobeIds.has(s.id))
        const existingDealIds = new Set((existing.brandDeals || []).map(d => d.id))
        const missingDeals = CAMILA_SEED.brandDeals.filter(d => !existingDealIds.has(d.id))
        const existingVideoIds = new Set((existing.generationHistory || []).filter(e => e.type === 'video').map(e => e.id))
        const missingVideos = CAMILA_SEED.generationHistory.filter(e => e.type === 'video' && !existingVideoIds.has(e.id))
        const needsPatch = !existing.closeUpImage1 || !existing.closeUpImage2 || !existing.mainImage
          || missingWardrobe.length || missingDeals.length || missingVideos.length
        if (needsPatch) {
          writeInfluencer({
            ...existing,
            mainImage: existing.mainImage || CAMILA_SEED.mainImage,
            characterSheetImage: existing.characterSheetImage || CAMILA_SEED.characterSheetImage,
            closeUpImage1: existing.closeUpImage1 || CAMILA_SEED.closeUpImage1,
            closeUpImage2: existing.closeUpImage2 || CAMILA_SEED.closeUpImage2,
            wardrobeSlots: [...(existing.wardrobeSlots || []), ...missingWardrobe],
            brandDeals: [...(existing.brandDeals || []), ...missingDeals],
            generationHistory: [...missingVideos, ...(existing.generationHistory || [])],
            physicalDesc: existing.physicalDesc || CAMILA_SEED.physicalDesc,
            backstory: existing.backstory || CAMILA_SEED.backstory,
          })
        }
      }
    }
  }
} catch (_) {}

// Step 3: Inject Camila sample photos into photo_studio_history
try {
  const CAMILA_PHOTO_URLS = [
    '/camila/photos/p1.webp', '/camila/photos/p2.webp', '/camila/photos/p3.webp',
    '/camila/photos/p4.webp', '/camila/photos/p5.webp', '/camila/photos/p6.webp',
    '/camila/photos/p7.webp', '/camila/photos/p8.webp', '/camila/photos/p9.webp',
    '/camila/photos/p10.webp', '/camila/photos/p11.webp',
    '/camila/photos/p12.webp', '/camila/photos/p13.webp',
  ]
  const existing = JSON.parse(localStorage.getItem('photo_studio_history') || '[]')
  // Drop photo history rows that belonged to retired demos (keep user + Camila)
  const cleaned = existing.filter(e => !e.influencerId || e.influencerId === 'camila-template' || !REMOVED_DEMO_IDS.has(e.influencerId))
  const existingUrls = new Set(cleaned.map(e => e.url))
  const toAdd = CAMILA_PHOTO_URLS.filter(url => !existingUrls.has(url)).map(url => ({
    influencerId: 'camila-template',
    influencerName: 'Camila',
    url,
    createdAt: 1748131200000,
    location: '',
    timeOfDay: '',
    aspectRatio: '9:16',
    settings: null,
  }))
  if (toAdd.length || cleaned.length !== existing.length) {
    try { localStorage.setItem('photo_studio_history', JSON.stringify([...cleaned, ...toAdd])) } catch {}
  }
} catch (_) {}

const TEMPLATE_IDS = new Set(['camila-template'])

// Generic hybrid collection: localStorage when signed-out (unchanged), server (D1) when
// signed-in. Same [value, setValue] shape as useLocalStorage, so consumers don't change.
const inspirationResource = { list: () => api.inspiration.list(), saveAll: (a) => api.inspiration.saveAll(a) }
const brandDealsResource  = { list: () => api.brandDeals.list(),  saveAll: (a) => api.brandDeals.saveAll(a) }

function useHybridCollection(localKey, resource, initial) {
  const [value, setValue] = useLocalStorage(localKey, initial)
  const { isLoaded, isSignedIn } = useAuth()
  const sourceRef = useRef('local')
  const lastServerSnapshot = useRef(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    resource.list()
      .then(async (serverArr) => {
        if (!alive) return
        if (serverArr && serverArr.length) {
          lastServerSnapshot.current = serverArr
          sourceRef.current = 'server'
          setValue(serverArr)
        } else {
          const local = valueRef.current
          if (local && local.length) await resource.saveAll(local).catch(() => {})
          sourceRef.current = 'server'
        }
      })
      .catch(() => { /* stay on localStorage */ })
    return () => { alive = false }
  }, [isLoaded, isSignedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sourceRef.current !== 'server') return
    if (value === lastServerSnapshot.current) return
    const t = setTimeout(() => { resource.saveAll(valueRef.current).catch(() => {}) }, 700)
    return () => clearTimeout(t)
  }, [value])

  return [value, setValue]
}

// Photo Studio history is a shared-localStorage-key collection coordinated across pages via the
// 'photo_studio_history_updated' event (not the context pattern used above), so it gets a sync
// daemon instead of useHybridCollection. This keeps all four consumers — PhotoStudio, the
// Influencers "Photos" tab, Dashboard, and the seed logic — untouched: they keep reading and
// writing the same localStorage key, and this daemon mirrors it to D1 for signed-in users.
const PHOTO_HISTORY_KEY = 'photo_studio_history'
const PHOTO_HISTORY_EVENT = 'photo_studio_history_updated'

function readPhotoHistory() {
  try { return JSON.parse(localStorage.getItem(PHOTO_HISTORY_KEY) || '[]') } catch { return [] }
}
function writePhotoHistory(list) {
  try { localStorage.setItem(PHOTO_HISTORY_KEY, JSON.stringify(list)) } catch {}
  window.dispatchEvent(new CustomEvent(PHOTO_HISTORY_EVENT))
}

function usePhotoHistorySync() {
  const { isLoaded, isSignedIn } = useAuth()
  const ready = useRef(false) // true once server hydration settles — gates upstream saves

  // Hydrate on sign-in: server wins if it has data; otherwise seed the server from local
  // (first sign-in import, mirroring useHybridCollection's semantics).
  useEffect(() => {
    ready.current = false
    if (!isLoaded || !isSignedIn) return
    let alive = true
    api.photoHistory.list()
      .then(async (serverArr) => {
        if (!alive) return
        if (serverArr && serverArr.length) {
          writePhotoHistory(serverArr) // overwrite local + notify the consumers to re-read
        } else {
          const local = readPhotoHistory()
          if (local.length) await api.photoHistory.saveAll(local).catch(() => {})
        }
        ready.current = true
      })
      .catch(() => { /* stay on localStorage-only */ })
    return () => { alive = false }
  }, [isLoaded, isSignedIn])

  // Mirror every local change up (debounced). Every writer dispatches this event, so adds and
  // deletes across all pages are covered. The `ready` gate ignores the hydrate write itself.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let t = null
    const onChange = () => {
      if (!ready.current) return
      clearTimeout(t)
      t = setTimeout(() => { api.photoHistory.saveAll(readPhotoHistory()).catch(() => {}) }, 800)
    }
    window.addEventListener(PHOTO_HISTORY_EVENT, onChange)
    return () => { window.removeEventListener(PHOTO_HISTORY_EVENT, onChange); clearTimeout(t) }
  }, [isLoaded, isSignedIn])
}

export function StoreProvider({ children }) {
  // Ship: only Camila as the starter example influencer
  const influencerStore = useInfluencerStore([CAMILA_SEED])
  const inspirationState = useHybridCollection('inspiration_boards', inspirationResource, [])
  const brandDealsState  = useHybridCollection('brand_deals', brandDealsResource, [])
  usePhotoHistorySync()
  const [, setInspirationBoards] = inspirationState
  const [, setDealsData]         = brandDealsState

  // Seed from /seeds.json — ship file only contains Camila (+ sample media)
  useEffect(() => {
    fetch('/seeds.json')
      .then(r => r.json())
      .then(seeds => {
        const shipIds = (seeds.influencer_ids || []).filter(id => id === 'camila-template')
        const currentIds = new Set(readIds() || [])
        const missingSeedIds = shipIds.filter(id => !currentIds.has(id))
        let didWrite = false

        if (missingSeedIds.length) {
          const allIds = [...(readIds() || [])]
          for (const id of missingSeedIds) {
            if (seeds.influencers?.[id]) {
              writeInfluencer(seeds.influencers[id])
              if (!allIds.includes(id)) allIds.unshift(id)
            }
          }
          writeIds(allIds)

          const existingPhotos = JSON.parse(localStorage.getItem('photo_studio_history') || '[]')
          const existingPhotoUrls = new Set(existingPhotos.map(p => p.url))
          const newPhotos = (seeds.photo_studio_history || [])
            .filter(p => p.influencerId === 'camila-template' || p.influencerName === 'Camila')
            .filter(p => !existingPhotoUrls.has(p.url))
            .map(p => ({ ...p, influencerId: 'camila-template' }))
          if (newPhotos.length) {
            const merged = [...existingPhotos, ...newPhotos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            try { localStorage.setItem('photo_studio_history', JSON.stringify(merged)) } catch {}
          }

          didWrite = true
        }

        // Patch Camila prompt/backstory if empty
        const camila = readInfluencer('camila-template')
        const seedInf = seeds.influencers?.['camila-template']
        if (camila && seedInf) {
          const needsPatch = (seedInf.prompt && !camila.prompt) || (seedInf.backstory && !camila.backstory)
          if (needsPatch) {
            writeInfluencer({
              ...camila,
              prompt: camila.prompt || seedInf.prompt || '',
              backstory: camila.backstory || seedInf.backstory || '',
            })
            didWrite = true
          }
        }

        const existingBoards = JSON.parse(localStorage.getItem('inspiration_boards') || '[]')
        const existingBoardIds = new Set(existingBoards.map(b => b.id))
        const newBoards = (seeds.inspiration_boards || []).filter(b => b.id && !existingBoardIds.has(b.id))
        if (newBoards.length) {
          setInspirationBoards(prev => {
            const prevIds = new Set(prev.map(b => b.id))
            const toAdd = newBoards.filter(b => !prevIds.has(b.id))
            return toAdd.length ? [...toAdd, ...prev] : prev
          })
        }

        const existingDeals = JSON.parse(localStorage.getItem('brand_deals') || '[]')
        const existingDealMap = new Map(existingDeals.map(d => [d.id, d]))
        const newDeals = (seeds.brand_deals || []).filter(d => d.id && !existingDealMap.has(d.id))
        if (newDeals.length) setDealsData([...newDeals, ...existingDeals])

        if (didWrite) window.location.reload()
      })
      .catch(e => console.warn('[seeds] failed to load:', e))
  }, []) // eslint-disable-line

  return (
    <InfluencersCtx.Provider value={influencerStore}>
      <InspirationCtx.Provider value={inspirationState}>
        <BrandDealsCtx.Provider value={brandDealsState}>
          {children}
        </BrandDealsCtx.Provider>
      </InspirationCtx.Provider>
    </InfluencersCtx.Provider>
  )
}

export function useInfluencers()       { return useContext(InfluencersCtx) }
export function useInspirationBoards() { return useContext(InspirationCtx) }
export function useBrandDeals()        { return useContext(BrandDealsCtx) }

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
