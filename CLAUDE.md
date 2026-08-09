# Project context for Claude Code

## What this app is

A React+Vite single-page app for designing and generating AI influencers.
Local-first: every user's data lives in their own browser localStorage.
Image and video generation happens through the user's own Higgsfield
account (OAuth, PKCE).

## Tech stack

- **Astryx** (`@astryxdesign/core` + `theme-neutral`) — design system pilot.
  Scope components under `src/ui/ax/AstryxScope.jsx`. Import CSS in
  `main.jsx` (`astryx.css` + `theme-neutral/theme.css`); do **not** import
  Astryx `reset.css` globally (fights Vymotion base styles). React 19 is
  required for Astryx (`use()`, `<Context value>`).
- **No build-time API keys** — Higgsfield is OAuthed per-user; the optional
  Claude features call through a serverless proxy that expects an
  `x-api-key` header from the browser.
- **PRODUCTION IS CLOUDFLARE, NOT VERCEL.** vymotion.org is served by the
  `vymotion-api` Worker (`worker/wrangler.toml`), which serves the built SPA
  from `../dist` via `[assets]` *and* runs the API. Deploy = `npm run build`
  in the repo root, then `wrangler deploy` from `worker/`.
  **`vercel.json` at the repo root is dead code** — a curl against the live
  site shows none of its headers are applied. Production headers and caching
  come from the generated `dist/_headers` file. Don't "fix" hosting behaviour
  by editing `vercel.json`; edit `worker/wrangler.toml` or `scripts/seo-build.js`.
- `api/*.js` are leftover Vercel serverless functions; `vite.config.js` mirrors
  them as local dev proxies. In production `/api/*` is handled by the Worker
  (`run_worker_first`), not by these files.
- The Worker (`worker/`) is also the API (credits, Polar, Postiz, fal
  generation). Frontend talks to it via `src/api/client.js`.

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
- Astryx's `<Heading level={1} type="display-2">` does **not** render at the same scale as
  `<Text type="display-2">` (24px/600 vs 35px/700). To add an `h1` to a page that uses the
  display Text, wrap it in a plain `<h1 style={{ font: 'inherit', margin: 0 }}>` rather than
  swapping the component, or the heading visibly shrinks.

## Debugging

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
