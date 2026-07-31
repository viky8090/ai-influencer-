// Build-time SEO emitter, run as a Vite plugin after the bundle is written.
//
// The problem it solves: this is a client-rendered SPA, so every URL was served the same
// dist/index.html — identical <title>, description, canonical and OG tags on /pricing,
// /earnings and everything else. Googlebot renders JS and eventually sees the real head,
// but Bing, Slack, X, LinkedIn, Facebook and the LLM crawlers do not render, so every share
// and every non-Google index entry showed homepage metadata.
//
// So for each indexable route we write dist/<route>/index.html — the same app bundle, with a
// route-correct <head> baked in. Vercel's filesystem check runs before the SPA rewrite, so
// /pricing is served from dist/pricing/index.html; deep links still boot the identical SPA.
//
// Also emits sitemap.xml and robots.txt from the same manifest, so they can't fall out of
// sync with the routes the way a hand-maintained sitemap does.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  ROUTES, INDEXABLE, PRIMARY_LINKS, SITE_URL, SITE_NAME,
  OG_ALT, LOCALES, seoTagsFor, staticJsonLd,
} from '../src/ui/seoRoutes.js'

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// JSON-LD lives in a script block, so the only dangerous sequence is a literal `</script>`.
const escJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

/** The managed <head> block for one route. Mirrors what useSEO sets at runtime. */
function headBlock(routePath) {
  const t = seoTagsFor(routePath, { jsonLd: staticJsonLd(routePath) })
  const lines = [
    `<title>${esc(t.title)}</title>`,
    `<meta name="description" content="${esc(t.description)}" />`,
    `<meta name="robots" content="${t.robots}" />`,
    `<link rel="canonical" href="${t.url}" />`,
  ]

  if (t.index) {
    // One English property serves every market, so annotate the language rather than
    // inventing per-country URLs that would compete with each other in the index.
    lines.push(`<link rel="alternate" hreflang="en" href="${t.url}" />`)
    lines.push(`<link rel="alternate" hreflang="x-default" href="${t.url}" />`)
  }

  lines.push(
    `<meta property="og:type" content="${t.type}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(t.title)}" />`,
    `<meta property="og:description" content="${esc(t.description)}" />`,
    `<meta property="og:url" content="${t.url}" />`,
    `<meta property="og:image" content="${t.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(OG_ALT)}" />`,
    `<meta property="og:locale" content="${LOCALES.primary}" />`,
    ...LOCALES.alternates.map((l) => `<meta property="og:locale:alternate" content="${l}" />`),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(t.title)}" />`,
    `<meta name="twitter:description" content="${esc(t.description)}" />`,
    `<meta name="twitter:image" content="${t.image}" />`,
    `<meta name="twitter:image:alt" content="${esc(OG_ALT)}" />`,
  )

  for (const node of t.graph) {
    lines.push(`<script type="application/ld+json" data-vy-seo>${escJson(node)}</script>`)
  }

  return lines.map((l) => '    ' + l).join('\n')
}

/**
 * No-JS fallback placed after #root. It never renders for a visitor with JS (that's what
 * <noscript> means) and React never touches it, but non-rendering crawlers get the page's
 * real heading, summary and internal links instead of an empty div. The copy is the same
 * content the rendered page shows — this is a progressive-enhancement fallback, not a
 * separate version of the page served only to bots.
 */
function bodyFallback(routePath) {
  const r = ROUTES[routePath]
  if (!r?.h1) return ''
  const links = PRIMARY_LINKS.filter(([, href]) => href !== routePath)
    .map(([label, href]) => `        <li><a href="${href}">${esc(label)}</a></li>`)
    .join('\n')

  return `
    <noscript>
      <h1>${esc(r.h1)}</h1>
      <p>${esc(r.intro || r.description)}</p>
      <nav aria-label="Site">
        <ul>
${links}
        </ul>
      </nav>
      <p><a href="${SITE_URL}/">${esc(SITE_NAME)}</a> — the studio for creating, growing and monetizing AI influencers.</p>
    </noscript>`
}

function renderRoute(template, routePath) {
  const head = headBlock(routePath)
  let html = template

  if (html.includes('<!--SEO:START-->')) {
    html = html.replace(
      /<!--SEO:START-->[\s\S]*?<!--SEO:END-->/,
      `<!--SEO:START-->\n${head}\n    <!--SEO:END-->`
    )
  } else {
    throw new Error('index.html is missing the <!--SEO:START--> / <!--SEO:END--> markers')
  }

  const fallback = bodyFallback(routePath)
  if (fallback) html = html.replace('<!--SEO:BODY-->', fallback)
  else html = html.replace('<!--SEO:BODY-->', '')

  return html
}

function sitemap(lastmod) {
  const urls = INDEXABLE.map((r) => {
    const loc = SITE_URL + (r.path === '/' ? '/' : r.path)
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority.toFixed(1)}</priority>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${loc}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`,
      '  </url>',
    ].join('\n')
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

// Answer engines are a real referral channel for this category, so they get the same access
// as everyone else. They're named explicitly rather than left to `*` so the intent is on the
// record — a future blanket AI block should be a deliberate edit, not an accident.
const AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

function robots() {
  // Disallow list is derived from the manifest, so a new private route can't be forgotten.
  const rules = [
    ...Object.entries(ROUTES)
      .filter(([p, r]) => !r.index && p !== '/404')
      .map(([p]) => `Disallow: ${p}`),
    // OAuth round-trips and handshake params carry no indexable content.
    'Disallow: /auth/',
    'Disallow: /*?*__clerk',
    'Disallow: /*?*__hfpath',
  ].join('\n')

  // A crawler obeys exactly one group — the most specific one that matches it — so each
  // named agent needs its own copy of the rules. Listing only `Allow: /` under GPTBot would
  // hand it the whole signed-in surface that `*` disallows.
  const group = (agent) => `User-agent: ${agent}\nAllow: /\n${rules}\n`

  return `# ${SITE_NAME} — ${SITE_URL}
# Generated at build time by scripts/seo-build.js — edit src/ui/seoRoutes.js, not this file.

${group('*')}
${AI_AGENTS.map(group).join('\n')}
Sitemap: ${SITE_URL}/sitemap.xml
`
}

/**
 * Cloudflare Workers static assets read `_headers` from the root of the assets directory
 * (worker/wrangler.toml points [assets] at ../dist). This is the only header mechanism that
 * actually reaches production — vercel.json is not the deploy path for this project, and a
 * curl against the live site confirms none of its headers were ever being applied.
 *
 * Two things it fixes:
 *  • Security headers were silently absent in production.
 *  • Content-hashed bundles were served `max-age=0, must-revalidate`, so every repeat visit
 *    revalidated every asset. Hashed filenames change when content changes, so they're safe
 *    to cache immutably for a year — this is a straight Core Web Vitals win on return visits.
 */
function headersFile() {
  return `# Generated at build time by scripts/seo-build.js — do not edit by hand.
# Consumed by Cloudflare Workers static assets (worker/wrangler.toml [assets]).

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains

# Vite emits content-hashed filenames here, so the URL changes whenever the bytes do.
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Crawler-facing files: short cache so a re-deploy is picked up quickly.
/sitemap.xml
  Cache-Control: public, max-age=3600, must-revalidate
/robots.txt
  Cache-Control: public, max-age=3600, must-revalidate

/og.jpg
  Cache-Control: public, max-age=604800
`
}

/**
 * Guard against manifest drift. Unmatched URLs are served the noindex 404 shell rather than
 * the app shell, so a route that exists in App.jsx but not in the manifest would 404 in
 * production while working perfectly in dev. Fail the build instead.
 */
async function assertRoutesMatchApp() {
  const appSrc = await fs.readFile(path.resolve(process.cwd(), 'src/App.jsx'), 'utf8')
  const declared = [...appSrc.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '*')

  const known = new Set(Object.keys(ROUTES))
  const missing = declared.filter((p) => !known.has(p))
  if (missing.length) {
    throw new Error(
      `SEO manifest is missing route(s) declared in App.jsx: ${missing.join(', ')}\n` +
      `Add them to src/ui/seoRoutes.js (set index:false for signed-in screens).`
    )
  }
}

/** @returns {import('vite').Plugin} */
export default function seoBuild() {
  return {
    name: 'vymotion-seo-build',
    apply: 'build',
    async closeBundle() {
      await assertRoutesMatchApp()

      const outDir = path.resolve(process.cwd(), 'dist')
      const indexPath = path.join(outDir, 'index.html')
      const template = await fs.readFile(indexPath, 'utf8')
      const lastmod = new Date().toISOString().slice(0, 10)

      // Every route gets a file, not just the indexable ones: the signed-in screens need a
      // real shell so a deep link to /dashboard is served from the filesystem rather than
      // falling through to the 404 handler. Theirs simply carry noindex.
      //
      // Emit `dist/<route>.html`, NOT `dist/<route>/index.html`. Cloudflare's default
      // html_handling ("auto-trailing-slash") serves <route>.html directly with a 200 for
      // /<route>, but when only the directory form exists it 307-redirects /<route> to
      // /<route>/ — a redirect that fights our own canonical (which carries no trailing
      // slash) and adds a round trip to every page. The flat form also makes /<route>/
      // redirect *to* the canonical URL, which is what we want. Verified with `wrangler dev`.
      let written = 0
      for (const routePath of Object.keys(ROUTES)) {
        if (routePath === '/404') continue
        const html = renderRoute(template, routePath)
        if (routePath === '/') {
          await fs.writeFile(indexPath, html, 'utf8')
        } else {
          const file = path.join(outDir, `${routePath}.html`)
          await fs.mkdir(path.dirname(file), { recursive: true })
          await fs.writeFile(file, html, 'utf8')
        }
        written++
      }

      // Unmatched URLs are rewritten here by vercel.json. A static host can't set a 404
      // status on an SPA route, so noindex is the strongest honest signal available.
      await fs.writeFile(path.join(outDir, '404.html'), renderRoute(template, '/404'), 'utf8')

      await fs.writeFile(path.join(outDir, 'sitemap.xml'), sitemap(lastmod), 'utf8')
      await fs.writeFile(path.join(outDir, 'robots.txt'), robots(), 'utf8')
      await fs.writeFile(path.join(outDir, '_headers'), headersFile(), 'utf8')

      const msg = `SEO: ${written} route shells (${INDEXABLE.length} indexable) + sitemap.xml + robots.txt + _headers (lastmod ${lastmod})`
      this.info?.(msg)
      console.log(`\n  ✓ ${msg}`)
    },
  }
}
