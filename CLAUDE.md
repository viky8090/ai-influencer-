# Project context for Claude Code

This file gives a new Claude Code session enough context to be useful
immediately. Read this first before making changes.

## What this app is

A React+Vite single-page app for designing and generating AI influencers.
Local-first: every user's data lives in their own browser localStorage.
Image and video generation happens through the user's own Higgsfield
account (OAuth, PKCE).

## Tech stack

- **React 19** + **Vite 5** + **React Router 6**
- **Astryx** (`@astryxdesign/core` + `theme-neutral`) — design system pilot.
  Scope components under `src/ui/ax/AstryxScope.jsx`. Import CSS in
  `main.jsx` (`astryx.css` + `theme-neutral/theme.css`); do **not** import
  Astryx `reset.css` globally (fights Vymotion base styles). React 19 is
  required for Astryx (`use()`, `<Context value>`).
- **No build-time API keys** — Higgsfield is OAuthed per-user; the optional
  Claude features call through a serverless proxy that expects an
  `x-api-key` header from the browser.
- **Vercel** is the intended host: `api/*.js` are Vercel serverless
  functions, and `vite.config.js` mirrors them as local dev proxies so
  the dev server behaves the same as production.
- **Cloudflare Worker** (`worker/`) is the production API (credits, Polar,
  Postiz, fal generation). Frontend talks to it via `src/api/client.js`.

## Key files to know

| Path | What it does |
|---|---|
| `src/App.jsx` | Routes + `<ThemeProvider>` + `<StoreProvider>` |
| `src/store.jsx` | localStorage-backed contexts (`useInfluencers`, etc.) and the Camila ship seed |
| `src/utils/higgsfieldAuth.js` | OAuth PKCE flow against `mcp.higgsfield.ai` |
| `src/utils/higgsfieldGenerate.js` | MCP-style image/video generation, polling, media uploads |
| `src/utils/systemPrompt.js` | Prompt templates — poses, wardrobe library, vibe palettes, Soul vs GPT Image 2 variants |
| `src/pages/Create.jsx` | Multi-step influencer creation wizard |
| `src/pages/Influencers.jsx` | Influencer profile + Content Studio + Video Studio (very large — known structural debt) |
| `api/hf/[...path].js` | Edge function that proxies all Higgsfield MCP traffic and forwards SSE streams |
| `api/claude.js` | Anthropic API proxy — caller supplies their own `x-api-key` |

## Conventions

- Inline styles with CSS variables (`var(--bg)`, `var(--text-primary)`).
  Theme tokens are set on `<html data-theme="dark|light">` from
  `src/context/theme.jsx`.
- IDs use `generateId()` from `store.jsx` (`Date.now() + random`).
- Legacy (MCP) models: `soul_2`, `gpt_image_2`, `nano_banana_2`,
  `nano_banana_flash`, `seedance_2_0`. Soul has its own simplified
  pose set (`POSES_SOUL`) because it struggles with detailed spatial pose
  instructions.
- Server-side (Vymotion) additionally supports fal.ai models: images
  `seedream_4`, `flux_krea`; video `seedance_pro`, `kling_2_5_pro`,
  `veo_3_fast`, `sora_2`. Model ids map to fal endpoints in
  `worker/src/providers/fal.js` and must have `price_book` rows.

## Things not to do

- **Never kill the Vite dev server** (port 5173). The owner wants it
  running at all times.
- Don't trust the comment in `modelBaseParams` saying resolution and
  quality conflict for `gpt_image_2` — they don't, the working code
  intentionally passes both.
- Don't refactor `Influencers.jsx` casually. It's 4,700+ lines and the
  state is tangled; any split needs its own dedicated session with
  in-browser verification of every flow.

## Dev workflow

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
npm run preview      # preview the production build locally
```

To diagnose Higgsfield issues, flip `HF_DEBUG = true` at the top of
`src/utils/higgsfieldGenerate.js` for verbose request/response logs.

<!-- ASTRYX:START -->
Astryx v0.1.4 · 149 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   149 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
