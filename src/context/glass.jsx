import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// Legacy glass-strength control. Editorial Studio uses solid surfaces, so the
// default is 0 and blur tokens stay at 0px. Settings UI can still expose the
// slider if present; it no longer changes the visual system meaningfully.

const KEY = 'vy_glass_strength'
const DEFAULT = 0

function clamp(n) {
  if (!Number.isFinite(n)) return DEFAULT
  return Math.min(1, Math.max(0, n))
}

function readInitial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) return DEFAULT
    return clamp(parseFloat(raw))
  } catch {
    return DEFAULT
  }
}

function apply(v) {
  document.documentElement.style.setProperty('--glass-strength', String(v))
}

apply(DEFAULT)

const GlassContext = createContext({ glass: DEFAULT, setGlass: () => {} })

export function GlassProvider({ children }) {
  const [glass, setGlassState] = useState(DEFAULT)

  useEffect(() => { apply(glass) }, [glass])

  const setGlass = useCallback((v) => {
    const next = clamp(typeof v === 'number' ? v : parseFloat(v))
    setGlassState(next)
    try { localStorage.setItem(KEY, String(next)) } catch { /* private mode */ }
  }, [])

  // Force solid default once per session (ignore stale full-glass prefs)
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== String(DEFAULT)) {
        localStorage.setItem(KEY, String(DEFAULT))
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <GlassContext.Provider value={{ glass, setGlass }}>
      {children}
    </GlassContext.Provider>
  )
}

export const useGlass = () => useContext(GlassContext)
