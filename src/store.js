import { useState, useEffect } from 'react'

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

export function useInfluencers() {
  return useLocalStorage('influencers', [])
}

export function useInspirationBoards() {
  return useLocalStorage('inspiration_boards', [])
}

export function useBrandDeals() {
  return useLocalStorage('brand_deals', [])
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
