# Vymotion

A web app for building, managing, and generating AI influencers — photos and
video. React + Vite frontend with Higgsfield for image & video generation.

> **Note:** this repo is mid-migration to the managed Vymotion SaaS described in
> [`VYMOTION_PRD.md`](VYMOTION_PRD.md). Today it still runs in its original
> local-first mode (your data lives in your browser; generation uses a connected
> Higgsfield account). The accounts, credits, billing, and server-side storage
> from the PRD are being built phase by phase.

---

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
npm run preview      # preview the production build
```

Then connect a Higgsfield account in **Settings → Connect Higgsfield**.

---

## Project structure

```
src/
  pages/           Routes: Landing, Influencers, Inspiration, BrandDeals, Create, Settings
  components/      Reusable UI: Nav, ImageGrid, MasonryGrid, Lightbox
  context/         React contexts (theme)
  utils/           Higgsfield API, OAuth, prompt builders, image helpers
  store.jsx        localStorage-backed React contexts
api/               Serverless functions (proxies + image proxy)
docs/              Prompt engineering reference docs
design/            Vymotion brand mockups (home, dashboard, pricing, paywall)
```

See [`CLAUDE.md`](CLAUDE.md) for codebase conventions and constraints, and
[`VYMOTION_PRD.md`](VYMOTION_PRD.md) for the full product roadmap.
