// Lightweight, dependency-free SEO head manager. Google renders client JS, so per-route
// meta injected here is indexed. Social scrapers (which don't run JS) fall back to the
// static defaults baked into index.html — good enough for a Vite SPA on Vercel/Pages.
import { useEffect } from 'react'

export const SITE_URL = 'https://vymotion.org'
export const DEFAULT_OG = `${SITE_URL}/og.png`

function upsertMeta(attr, key, content) {
  if (content == null) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useSEO({
  title,
  description,
  path = '/',
  image = DEFAULT_OG,
  type = 'website',
  jsonLd,
} = {}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null
  useEffect(() => {
    const fullTitle = title ? `${title} · Vymotion` : 'Vymotion — Create AI Influencers'
    const url = SITE_URL + path

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertLink('canonical', url)

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:site_name', 'Vymotion')

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    // JSON-LD structured data (one managed block)
    let script = document.getElementById('vy-jsonld')
    if (ld) {
      if (!script) {
        script = document.createElement('script')
        script.id = 'vy-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = ld
    } else if (script) {
      script.remove()
    }
  }, [title, description, path, image, type, ld])
}
