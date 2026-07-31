// Single source of truth for per-route SEO. Imported by three consumers that must never
// disagree with each other:
//   1. src/ui/seo.js      — runtime <head> for SPA navigation (what Googlebot's renderer sees)
//   2. scripts/seo-build.js — build-time per-route HTML shells + sitemap.xml + robots.txt
//   3. Footer/NotFound    — internal linking
//
// This file must stay React-free and side-effect-free: the Vite build script imports it
// directly from Node, before any bundling happens.
// Explicit .js extension: this module is also imported by plain Node (scripts/seo-build.js
// runs before bundling), and Node ESM does not resolve extensionless specifiers.
import { FAQ } from './marketData.js'

export const SITE_URL = 'https://vymotion.org'
export const SITE_NAME = 'Vymotion'
// JPEG, not PNG: the card is mostly smooth gradient, which PNG stores in ~630 KB and JPEG
// in ~71 KB. Social scrapers fetch this synchronously while rendering a preview.
export const DEFAULT_OG = `${SITE_URL}/og.jpg`
export const OG_ALT = 'Vymotion — the studio for creating and monetizing AI influencers'

// The site is one English property serving every market. Google's guidance for that case is
// a plain `en` annotation plus x-default rather than faking per-country URLs, so US, UK, and
// EU searchers all resolve to the same canonical page instead of competing duplicates.
export const LOCALES = { primary: 'en_US', alternates: ['en_GB', 'en_IE', 'en_CA'] }

/**
 * @typedef {object} SeoRoute
 * @property {string}  title       Complete <title>, brand included. Aim for <= 60 chars.
 * @property {string}  description Meta description. Aim for 140-160 chars.
 * @property {string}  h1          Primary heading — also used for the no-JS fallback.
 * @property {string}  intro       One-paragraph summary for the no-JS fallback.
 * @property {boolean} index       false => noindex + excluded from the sitemap.
 * @property {number}  priority    Sitemap priority.
 * @property {string}  changefreq  Sitemap change frequency.
 */

/** @type {Record<string, SeoRoute>} */
export const ROUTES = {
  '/': {
    title: 'AI Influencer Generator — Create & Monetize | Vymotion',
    description:
      'Create a hyper-realistic AI influencer, generate on-brand photos and video, and turn the audience into income. Built for creators and agencies in the US and Europe.',
    h1: 'Create your AI influencer',
    intro:
      'Vymotion is the all-in-one studio for AI influencers. Design a persona with a face that stays consistent across every shot, generate studio-quality photos and video, grow an audience on Instagram, TikTok, YouTube and X, then monetize it through brand deals, UGC and creator services. No camera, no crew, no editing suite.',
    index: true,
    priority: 1.0,
    changefreq: 'weekly',
  },

  '/how-it-works': {
    title: 'How to Create an AI Influencer in 5 Steps | Vymotion',
    description:
      'Step-by-step guide to building and monetizing an AI influencer: design a consistent persona, shoot photos and video, grow an audience, and land brand deals.',
    h1: 'How to create an AI influencer, step by step',
    intro:
      'Five steps take you from a blank canvas to a paid virtual influencer: design the persona and lock in a consistent identity, shoot in the Photo Studio, bring frames to life in the Video Studio, publish consistently across social platforms, and monetize through sponsorships, UGC packages, affiliate links and licensing.',
    index: true,
    priority: 0.9,
    changefreq: 'monthly',
  },

  '/earnings': {
    title: 'How AI Influencers Make Money — Earnings Guide | Vymotion',
    description:
      'What virtual influencers actually earn: sponsored-post rates by follower tier, six income streams, and how creators bill clients in USD, GBP and EUR.',
    h1: 'How AI influencers make money',
    intro:
      'The virtual-influencer market is compounding fast. This guide breaks down typical sponsored-post rates by audience size, the six income streams open to AI creators — brand deals, UGC sales, affiliate links, shoutouts, subscriptions and character licensing — and how the US, UK and EU markets differ on budgets, payment terms and AI-disclosure rules. Figures are industry estimates, not a guarantee of income.',
    index: true,
    priority: 0.9,
    changefreq: 'monthly',
  },

  '/pricing': {
    title: 'Pricing — AI Influencer Plans from $5.99/mo | Vymotion',
    description:
      'Start free, no card required. Credit-based plans from $5.99/month for AI influencer photos, video and publishing. Billed in USD, GBP or EUR with VAT handled.',
    h1: 'Pricing built for creators and agencies',
    intro:
      'Credits power everything — images, video and AI prompts — and you are only charged for delivered generations, with failed or filtered results always refunded. Explore free without a card, then scale from Starter through Creator, Pro and Studio. Billing runs through a merchant of record, so US sales tax and EU VAT are handled for you.',
    index: true,
    priority: 0.9,
    changefreq: 'monthly',
  },

  '/create': {
    title: 'Create Your AI Influencer Free | Vymotion',
    description:
      'Build an AI influencer in five minutes: pick a look, personality and niche, and get a persona whose face stays consistent across every shot. Free to start.',
    h1: 'Create your AI influencer',
    intro:
      'A five-step wizard walks you through look, body type, personality and niche, then locks in a consistent identity so the same face appears in every future shot. Free credits on sign-up, no card required.',
    index: true,
    priority: 0.8,
    changefreq: 'monthly',
  },

  '/docs': {
    title: 'Docs — Using the Vymotion AI Influencer Studio | Vymotion',
    description:
      'Documentation for the Vymotion studio: creating influencers, generating photos and video, credits and plans, scheduling posts, and troubleshooting generations.',
    h1: 'Vymotion documentation',
    intro:
      'Reference documentation covering the influencer wizard, Photo Studio and Video Studio, the credit system and plan limits, social publishing and scheduling, and answers to the most common generation problems.',
    index: true,
    priority: 0.6,
    changefreq: 'monthly',
  },

  '/contact': {
    title: 'Contact Vymotion — Support & Partnerships',
    description:
      'Get in touch with the Vymotion team about support, billing, agency partnerships or press. We answer creators and agencies across the US and Europe.',
    h1: 'Contact Vymotion',
    intro:
      'Questions about your account, billing, an agency partnership or press? Email contact@vymotion.org and the team will get back to you.',
    index: true,
    priority: 0.5,
    changefreq: 'yearly',
  },

  '/terms': {
    title: 'Terms of Service | Vymotion',
    description:
      'The terms governing use of Vymotion, including acceptable use, likeness and consent rules, commercial-use licensing, and account and billing conditions.',
    h1: 'Terms of Service',
    intro:
      'These terms cover acceptable use of the Vymotion studio, the likeness and consent rules that prohibit recreating real identifiable people, the commercial-use licence included with paid plans, and account, credit and billing conditions.',
    index: true,
    priority: 0.3,
    changefreq: 'yearly',
  },

  '/privacy': {
    title: 'Privacy Policy — GDPR & CCPA | Vymotion',
    description:
      'How Vymotion collects, stores and protects your data, your GDPR and CCPA rights, and why we never sell personal data or your generated creations.',
    h1: 'Privacy Policy',
    intro:
      'What data Vymotion collects, how long it is kept, who processes it, and the rights you hold under GDPR and CCPA. Your creations and account data are yours and are never sold.',
    index: true,
    priority: 0.3,
    changefreq: 'yearly',
  },

  '/cookies': {
    title: 'Cookie Policy | Vymotion',
    description:
      'Which cookies and browser storage Vymotion uses, what each one is for, and how to clear them. Vymotion is local-first, so most data stays on your own device.',
    h1: 'Cookie Policy',
    intro:
      'Vymotion is local-first: most of your data lives in your own browser storage. This policy lists the cookies and storage keys in use, what each is for, and how to clear them.',
    index: true,
    priority: 0.2,
    changefreq: 'yearly',
  },

  '/dmca': {
    title: 'DMCA & Content Takedown Policy | Vymotion',
    description:
      'How to report infringing or non-consensual content on Vymotion, what a valid DMCA notice must contain, and how counter-notices are handled.',
    h1: 'DMCA & takedown policy',
    intro:
      'How to submit a DMCA notice or report non-consensual likeness use, what information a valid notice must include, and the counter-notice process.',
    index: true,
    priority: 0.2,
    changefreq: 'yearly',
  },

  // ── Signed-in application surface ──────────────────────────────────────────
  // Thin, personalised or gated screens. Kept out of the index so crawl budget goes to the
  // marketing pages, and so Google never surfaces an empty logged-out shell as a result.
  '/dashboard': { title: 'Dashboard | Vymotion', description: 'Your Vymotion dashboard.', index: false },
  '/influencers': { title: 'Your Influencers | Vymotion', description: 'Manage your AI influencers.', index: false },
  // Sign-in gated in App.jsx. A crawler only ever sees the sign-in redirect here, and the
  // pages themselves are personal workspaces (saved boards, saved deal sheets) with nothing
  // for a searcher — so they're noindex and stay out of the sitemap.
  '/brand-deals': { title: 'Brand Deals | Vymotion', description: 'Your saved brand-deal sheets.', index: false },
  '/inspiration': { title: 'Inspiration Boards | Vymotion', description: 'Your saved moodboards and reference images.', index: false },
  '/publish': { title: 'Publish | Vymotion', description: 'Schedule and publish posts.', index: false },
  '/usage': { title: 'Usage | Vymotion', description: 'Your credit usage and history.', index: false },
  '/settings': { title: 'Settings | Vymotion', description: 'Your account settings.', index: false },
  '/auth/callback': { title: 'Signing in… | Vymotion', description: 'Completing sign-in.', index: false },
  '/404': {
    title: 'Page not found | Vymotion',
    description: 'That page does not exist. Head back to the Vymotion AI influencer studio.',
    h1: 'Page not found',
    index: false,
  },
}

/** Routes that belong in the sitemap and get a prerendered HTML shell. */
export const INDEXABLE = Object.entries(ROUTES)
  .filter(([, r]) => r.index)
  .map(([path, r]) => ({ path, ...r }))

/**
 * Marketing nav used in the crawlable no-JS fallback and on the 404 page.
 *
 * Filtered against the index flag rather than hand-maintained: a route that later becomes
 * sign-in gated must not keep appearing in crawler-facing navigation, where every link
 * would resolve to a sign-in redirect and burn crawl budget.
 */
const NAV_LABELS = [
  ['How it works', '/how-it-works'],
  ['Earnings', '/earnings'],
  ['Pricing', '/pricing'],
  ['Docs', '/docs'],
  ['Create an influencer', '/create'],
  ['Contact', '/contact'],
]
export const PRIMARY_LINKS = NAV_LABELS.filter(([, href]) => ROUTES[href]?.index)

export function getRoute(path) {
  return ROUTES[path] || ROUTES['/404']
}

// ── Structured data ──────────────────────────────────────────────────────────
// Pure builders shared by the runtime hook and the build script, so a prerendered shell and
// the hydrated page describe the same entity to Google.

/**
 * Nodes repeated on every indexable page. Organization and WebSite are site-wide on purpose
 * — it's the documented way to let Google resolve one entity for the domain rather than
 * treating each URL as an unrelated page.
 */
export function baseGraph() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
      email: 'contact@vymotion.org',
      description:
        'Vymotion is a studio for creating, growing and monetizing hyper-realistic AI influencers.',
      areaServed: ['US', 'GB', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'CA'],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'contact@vymotion.org',
        availableLanguage: ['English'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ]
}

/** BreadcrumbList for a sub-page. Home is always the first crumb. */
export function breadcrumb(path, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: SITE_URL + path },
    ],
  }
}

export function faqSchema(items = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

/**
 * Schema that the build script can emit statically, i.e. anything derivable from plain data
 * rather than from a React component's props. Page components add richer nodes (HowTo, plan
 * Offers) at runtime — Google picks those up when it renders the JS.
 */
export function staticJsonLd(path) {
  if (path === '/') return [faqSchema()]
  if (path === '/earnings') return [faqSchema(FAQ.slice(0, 4))]
  return []
}

/**
 * Complete tag set for a route. Pure, and the single place where head values are decided —
 * both the runtime hook and the prerenderer call this, so they can't drift.
 */
export function seoTagsFor(path, overrides = {}) {
  const route = ROUTES[path] || {}
  const {
    title = route.title || 'Vymotion — AI Influencer Generator',
    description = route.description || '',
    image = DEFAULT_OG,
    type = path === '/' ? 'website' : 'article',
    index = route.index !== false,
    jsonLd,
  } = overrides

  const url = SITE_URL + (path === '/' ? '/' : path)
  const extra = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  const graph = index
    ? [
        ...baseGraph(),
        ...(path !== '/' && route.h1 ? [breadcrumb(path, route.h1)] : []),
        ...extra,
      ]
    : []

  return {
    title,
    description,
    url,
    image,
    type,
    index,
    // max-image-preview:large is what makes a page eligible for large thumbnails in Google
    // Discover and image-rich European SERPs; without it previews stay text-only.
    robots: index
      ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      : 'noindex, nofollow',
    graph,
  }
}
