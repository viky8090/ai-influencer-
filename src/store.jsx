import { useState, useEffect, createContext, useContext } from 'react'

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
      alert('Storage full — your last change could not be saved. Try removing some images to free up space.')
    }
  }, [key, value])

  return [value, setValue]
}

// ── Shared contexts — one source of truth across all pages ──
const InfluencersCtx = createContext(null)
const InspirationCtx = createContext(null)
const BrandDealsCtx  = createContext(null)

export function StoreProvider({ children }) {
  const influencers = useLocalStorage('influencers', [])
  const inspiration = useLocalStorage('inspiration_boards', [])
  const brandDeals  = useLocalStorage('brand_deals', [])
  return (
    <InfluencersCtx.Provider value={influencers}>
      <InspirationCtx.Provider value={inspiration}>
        <BrandDealsCtx.Provider value={brandDeals}>
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
