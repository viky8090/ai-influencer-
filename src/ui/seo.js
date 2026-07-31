// Dependency-free SEO head manager for the SPA.
//
// Two layers cooperate here:
//   • Build time — scripts/seo-build.js writes a per-route HTML shell whose <head> already
//     carries the right title/description/canonical/OG/JSON-LD. That is what non-rendering
//     crawlers (Bing, Slack, X, LinkedIn, GPTBot, ClaudeBot) and social scrapers read.
//   • Runtime — this hook keeps that head correct as the user (or Googlebot's renderer)
//     navigates client-side.
//
// Both layers emit the same selectors, so the hook *updates* the prerendered tags in place
// rather than duplicating them. JSON-LD is marked with data-vy-seo so the managed block can
// be replaced between route changes without touching anyone else's tags.
import { useEffect } from 'react'
import {
  SITE_URL, SITE_NAME, DEFAULT_OG, OG_ALT, LOCALES,
  seoTagsFor, baseGraph, breadcrumb, faqSchema,
} from './seoRoutes'

// Re-exported so pages can keep importing everything SEO-related from one module.
export { SITE_URL, SITE_NAME, DEFAULT_OG, seoTagsFor, baseGraph, breadcrumb, faqSchema }

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

function upsertLink(rel, href, hreflang) {
  const sel = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`
  let el = document.head.querySelector(sel)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    if (hreflang) el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function useSEO({ path = '/', ...overrides } = {}) {
  // Serialised so the effect re-runs on real content changes, not on every render.
  const key = JSON.stringify({ path, ...overrides })

  useEffect(() => {
    const t = seoTagsFor(path, overrides)

    document.title = t.title
    upsertMeta('name', 'description', t.description)
    upsertMeta('name', 'robots', t.robots)
    upsertLink('canonical', t.url)

    // Open Graph
    upsertMeta('property', 'og:title', t.title)
    upsertMeta('property', 'og:description', t.description)
    upsertMeta('property', 'og:url', t.url)
    upsertMeta('property', 'og:type', t.type)
    upsertMeta('property', 'og:image', t.image)
    upsertMeta('property', 'og:image:width', '1200')
    upsertMeta('property', 'og:image:height', '630')
    upsertMeta('property', 'og:image:alt', OG_ALT)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', LOCALES.primary)

    // Twitter / X
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', t.title)
    upsertMeta('name', 'twitter:description', t.description)
    upsertMeta('name', 'twitter:image', t.image)
    upsertMeta('name', 'twitter:image:alt', OG_ALT)

    // One English property serves every market, so annotate the language rather than
    // inventing per-country URLs that would compete with each other.
    if (t.index) {
      upsertLink('alternate', t.url, 'en')
      upsertLink('alternate', t.url, 'x-default')
    }

    // Replace the managed JSON-LD block wholesale so schema from the previous route never
    // lingers after a client-side navigation.
    document.head.querySelectorAll('script[data-vy-seo]').forEach((n) => n.remove())
    for (const node of t.graph) {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.setAttribute('data-vy-seo', '')
      s.textContent = JSON.stringify(node)
      document.head.appendChild(s)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
