// Account-level helpers: local storage accounting, backup export/import, wipe.
//
// Everything in this app lives in the user's own browser, so "your account"
// really means "the localStorage on this device". These helpers make that
// concrete and manageable instead of invisible.

// ── What we own ───────────────────────────────────────────────────
//
// localStorage is per-origin, so with one exception every key here was
// written by this app. Ownership is therefore a denylist, not an allowlist:
// an allowlist silently drops keys from backups, and this app writes 40+
// distinct key shapes (per-influencer Photo Studio settings, saved prompts,
// start frames, wardrobe selections, roster order…). Missing any of them
// would make "back up, move browser, restore" quietly lose work.

// Credentials. Never written into an export file, and only erased when the
// caller explicitly asks to disconnect. Names verified against
// utils/higgsfieldAuth.js — do not guess them.
const SECRET_KEYS = [
  'claude_api_key',
  'hf_access_token',
  'hf_refresh_token',
  'hf_token_expires_at',
  'hf_client_id',
  'hf_verifier',
  'hf_state',
  'hf_referral_fired',
]

// Keys written by something other than this app's own features. Left alone
// by both backup and wipe.
const FOREIGN_PREFIXES = [
  'va-',        // Vercel Web Analytics
  '_vercel',
  'debug',
]

export function isSecretKey(key) {
  return SECRET_KEYS.includes(key)
}

export function isForeignKey(key) {
  return FOREIGN_PREFIXES.some(p => key.startsWith(p))
}

// Content and settings this app is responsible for: everything that is
// neither a credential nor somebody else's key.
export function isOwnedKey(key) {
  return !isSecretKey(key) && !isForeignKey(key)
}

// Approximate bytes a string occupies in localStorage. Browsers store UTF-16,
// so two bytes per code unit is the right first-order estimate.
function byteSize(str) {
  return (str || '').length * 2
}

const CATEGORIES = [
  {
    id: 'influencers', label: 'Influencers', color: '#EC4899',
    match: k => k.startsWith('hf_influencer_') || k === 'influencer_ids' || k === 'influencers',
  },
  {
    id: 'photos', label: 'Photo history', color: '#8B5CF6',
    match: k => k === 'photo_studio_history',
  },
  {
    id: 'videos', label: 'Video history', color: '#6366F1',
    match: k => k.startsWith('hf_video_history_'),
  },
  {
    id: 'inspiration', label: 'Inspiration', color: '#0EA5E9',
    match: k => k === 'inspiration_boards',
  },
  {
    id: 'deals', label: 'Brand deals', color: '#F59E0B',
    match: k => k === 'brand_deals',
  },
  {
    // Reference images and start frames are stored as base64 and are by far
    // the heaviest thing here, so they get their own slice rather than
    // disappearing into a catch-all.
    id: 'references', label: 'Reference images', color: '#14B8A6',
    match: k => k.startsWith('hf_start_frame_') || k.startsWith('hf_product_ref_') ||
                k.startsWith('wd_result_') || k.startsWith('wd_gen_result_') ||
                k.startsWith('hf_gen_results_'),
  },
  {
    id: 'studio', label: 'Studio settings', color: '#10B981',
    match: k => k.startsWith('ps_') || k.startsWith('cs_') || k.startsWith('inf_') ||
                k.startsWith('hf_last_prompt_') || k.startsWith('hf_home_id_') ||
                k.startsWith('hf_wardrobe_id_') || k.startsWith('hf_voice_') ||
                k.startsWith('hf_env_') || k.startsWith('hf_shot_mode') ||
                k === 'hf_aspect' || k === 'hf_resolution' || k === 'hf_outputs' ||
                k === 'hf_camera' || k === 'hf_duration' || k === 'hf_vibe',
  },
  {
    id: 'settings', label: 'App settings', color: '#64748B',
    match: k => k === 'studio_profile' || k === 'studio_preferences' ||
                k === 'theme' || k === 'theme_default_v2',
  },
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
        // Credentials and anything unrecognised. Counted toward the total —
        // it occupies the same budget — but not attributed to a category.
        other += size
      }
    }
  } catch {
    // Storage can be unavailable (private mode, disabled cookies). Report
    // zero rather than crashing the page that renders this.
  }

  const total = owned + other
  return {
    total,
    owned,
    other,
    budget: STORAGE_BUDGET_BYTES,
    percent: Math.min(100, (total / STORAGE_BUDGET_BYTES) * 100),
    categories: CATEGORIES
      .map(c => ({ id: c.id, label: c.label, color: c.color, bytes: buckets[c.id] }))
      .sort((a, b) => b.bytes - a.bytes),
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const BACKUP_VERSION = 1

// A plain JSON snapshot of every owned key. Credentials are excluded so a
// backup file can be emailed or synced without leaking an API key.
export function buildBackup() {
  const data = {}
  try {
    for (const key of Object.keys(localStorage)) {
      if (!isOwnedKey(key)) continue
      const value = localStorage.getItem(key)
      if (typeof value === 'string') data[key] = value
    }
  } catch {
    // Unreadable storage yields an empty backup rather than an exception.
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

export function isValidBackup(parsed) {
  return !!parsed &&
    typeof parsed === 'object' &&
    parsed.format === 'influencer-studio-backup' &&
    !!parsed.data &&
    typeof parsed.data === 'object' &&
    Number(parsed.version || 0) <= BACKUP_VERSION
}

function describeInvalidBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'That file is not a backup.'
  if (parsed.format !== 'influencer-studio-backup') return 'Not an Influencer Studio backup file.'
  if (!parsed.data || typeof parsed.data !== 'object') return 'Backup file is missing its data.'
  if (Number(parsed.version || 0) > BACKUP_VERSION) return 'This backup was made by a newer version of the app.'
  return 'That backup file could not be read.'
}

/**
 * Writes a validated backup back into localStorage.
 *
 * `mode` is 'merge' (only add keys that are missing) or 'replace' (overwrite
 * every owned key present in the file).
 *
 * The write is transactional: if the browser runs out of quota part-way, every
 * key touched so far is restored to its previous value before throwing. A
 * half-applied restore is worse than no restore at all — `influencer_ids` can
 * end up naming records that were never written, which reads as silent data
 * loss.
 *
 * Returns { written, skipped }.
 */
export function restoreBackup(parsed, mode = 'replace') {
  if (!isValidBackup(parsed)) throw new Error(describeInvalidBackup(parsed))

  const undo = []
  let written = 0
  let skipped = 0

  try {
    for (const [key, value] of Object.entries(parsed.data)) {
      // A hand-edited backup must not be able to plant a credential or a key
      // belonging to something else.
      if (!isOwnedKey(key) || typeof value !== 'string') { skipped++; continue }
      if (mode === 'merge' && localStorage.getItem(key) !== null) { skipped++; continue }

      undo.push([key, localStorage.getItem(key)])
      localStorage.setItem(key, value)
      written++
    }
  } catch {
    for (const [key, previous] of undo.reverse()) {
      try {
        if (previous === null) localStorage.removeItem(key)
        else localStorage.setItem(key, previous)
      } catch {
        // Rolling back only frees space, so this should not fail — but if it
        // does there is nothing further we can do here.
      }
    }
    throw new Error(
      'Ran out of browser storage part-way through the restore, so nothing was changed. ' +
      'Delete some influencers or generated images to free space, then try again.'
    )
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
  try {
    for (const key of Object.keys(localStorage)) {
      const shouldRemove = isSecretKey(key) ? includeConnections : isOwnedKey(key)
      if (!shouldRemove) continue
      try { localStorage.removeItem(key); removed++ } catch {}
    }
  } catch {}
  return removed
}

export { SECRET_KEYS }
