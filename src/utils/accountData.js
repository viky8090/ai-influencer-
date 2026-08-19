// Account-level helpers: local storage accounting, backup export/import, wipe.
// Everything in this app lives in the user's own browser, so "your account"
// really means "the localStorage on this device" — these helpers make that
// concrete and manageable instead of invisible.

const INF_PREFIX = 'hf_influencer_'

// Keys we own. Anything matching one of these prefixes is app data and is
// included in a backup; everything else in localStorage is left alone.
const OWNED_PREFIXES = [
  'hf_influencer_',
  'hf_video_history_',
  'photo_studio_history',
  'influencer_ids',
  'influencers',
  'inspiration_boards',
  'brand_deals',
  'studio_profile',
  'studio_preferences',
  'theme',
  'theme_default_v2',
]

// Keys that hold a credential — never written into an export file.
const SECRET_KEYS = [
  'claude_api_key',
  'hf_access_token',
  'hf_refresh_token',
  'hf_token_expires_at',
  'hf_pkce_verifier',
  'hf_oauth_state',
]

export function isOwnedKey(key) {
  return OWNED_PREFIXES.some(p => key === p || key.startsWith(p))
}

// Approximate bytes a string occupies in localStorage. Browsers store UTF-16,
// so two bytes per code unit is the right first-order estimate.
function byteSize(str) {
  return (str || '').length * 2
}

const CATEGORIES = [
  { id: 'influencers', label: 'Influencers',   color: '#EC4899', match: k => k.startsWith(INF_PREFIX) || k === 'influencer_ids' || k === 'influencers' },
  { id: 'photos',      label: 'Photo history', color: '#8B5CF6', match: k => k === 'photo_studio_history' },
  { id: 'videos',      label: 'Video history', color: '#6366F1', match: k => k.startsWith('hf_video_history_') },
  { id: 'inspiration', label: 'Inspiration',   color: '#0EA5E9', match: k => k === 'inspiration_boards' },
  { id: 'deals',       label: 'Brand deals',   color: '#F59E0B', match: k => k === 'brand_deals' },
  { id: 'settings',    label: 'Settings',      color: '#10B981', match: k => k === 'studio_profile' || k === 'studio_preferences' || k === 'theme' || k === 'theme_default_v2' },
]

// Most browsers cap localStorage per origin at ~5 MB. Used only to render a
// "how full am I" bar, so an approximation is honest as long as we say so.
export const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024

export function readStorageUsage() {
  const buckets = Object.fromEntries(CATEGORIES.map(c => [c.id, 0]))
  let owned = 0
  let other = 0

  try {
    for (const key of Object.keys(localStorage)) {
      const size = byteSize(key) + byteSize(localStorage.getItem(key))
      const cat = CATEGORIES.find(c => c.match(key))
      if (cat) {
        buckets[cat.id] += size
        owned += size
      } else {
        other += size
      }
    }
  } catch {
    // Storage can be unavailable (private mode, disabled cookies). Report zero
    // rather than crashing the page that renders this.
  }

  return {
    total: owned + other,
    owned,
    other,
    budget: STORAGE_BUDGET_BYTES,
    percent: Math.min(100, ((owned + other) / STORAGE_BUDGET_BYTES) * 100),
    categories: CATEGORIES.map(c => ({
      id: c.id,
      label: c.label,
      color: c.color,
      bytes: buckets[c.id],
    })).sort((a, b) => b.bytes - a.bytes),
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const BACKUP_VERSION = 1

// Builds a plain JSON snapshot of every owned key. Credentials are excluded so
// a backup file can be emailed or synced without leaking an API key.
export function buildBackup() {
  const data = {}
  for (const key of Object.keys(localStorage)) {
    if (SECRET_KEYS.includes(key)) continue
    if (!isOwnedKey(key)) continue
    data[key] = localStorage.getItem(key)
  }
  return {
    format: 'influencer-studio-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    keyCount: Object.keys(data).length,
    data,
  }
}

export function downloadBackup() {
  const backup = buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `influencer-studio-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  // Revoke on the next tick so the click has already been handled.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return backup
}

// Validates a parsed backup and writes it back. `mode` is 'merge' (only add
// keys that are missing) or 'replace' (overwrite every owned key present in
// the file). Returns { written, skipped }.
export function restoreBackup(parsed, mode = 'replace') {
  if (!parsed || parsed.format !== 'influencer-studio-backup') {
    throw new Error('Not an Influencer Studio backup file.')
  }
  if (typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('Backup file is missing its data.')
  }
  if (Number(parsed.version) > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app.')
  }

  let written = 0
  let skipped = 0
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!isOwnedKey(key) || SECRET_KEYS.includes(key)) { skipped++; continue }
    if (typeof value !== 'string') { skipped++; continue }
    if (mode === 'merge' && localStorage.getItem(key) !== null) { skipped++; continue }
    try {
      localStorage.setItem(key, value)
      written++
    } catch {
      // Quota exhausted mid-restore. Stop here rather than writing a partial,
      // inconsistent influencer list.
      throw new Error(`Ran out of browser storage after restoring ${written} item${written === 1 ? '' : 's'}. Free up space and try again.`)
    }
  }
  return { written, skipped }
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch {
        reject(new Error('That file is not valid JSON.'))
      }
    }
    reader.readAsText(file)
  })
}

// Removes every owned key. Credentials are kept unless `includeConnections`,
// so "start over with my content" doesn't silently sign you out of Higgsfield.
export function wipeAllData({ includeConnections = false } = {}) {
  let removed = 0
  for (const key of Object.keys(localStorage)) {
    const secret = SECRET_KEYS.includes(key)
    if (secret ? includeConnections : isOwnedKey(key)) {
      try { localStorage.removeItem(key); removed++ } catch {}
    }
  }
  return removed
}

export { SECRET_KEYS }
