# Vymotion API (Cloudflare Worker)

The server-side half of Vymotion: API gateway + business logic per PRD §12.
The React SPA (repo root) deploys separately to Cloudflare Pages and calls this
Worker at `/api/*` and `/webhooks/*`.

> **Status: scaffold (Phase 0b).** Routes, Durable Objects, and provider adapters
> are skeletons with clear `TODO(phase-N)` markers. No business logic is wired to
> real providers yet. Nothing here is deployed.

## Layout

```
worker/
  wrangler.toml            Bindings: D1, KV, R2, Queues, Durable Objects, cron
  migrations/              D1 schema (0001) + price-book seed (0002)
  .dev.vars.example        Secret names (Appendix C) — copy to .dev.vars
  src/
    index.js               Hono app: middleware + route mounting + queue consumer + DO exports
    lib/                    ids, db helpers, Clerk auth, price book, idempotency
    do/                     CreditAccount (per-user balance), GenerationJob (lifecycle)
    providers/              higgsfield (Platform REST), anthropic (Claude)
    routes/                 me, credits, generate, generations, influencers, assets, billing, admin
    webhooks/               higgsfield, polar, clerk (signed, idempotent)
```

## First-time Cloudflare setup

These create the real resources and print the ids to paste into `wrangler.toml`:

```bash
cd worker
npm install
npx wrangler login

npx wrangler d1 create vymotion                      # → database_id
npx wrangler kv namespace create KV                  # → id
npx wrangler r2 bucket create vymotion-assets
npx wrangler queues create vymotion-generation
npx wrangler queues create vymotion-generation-dlq
```

Paste the printed ids into `wrangler.toml`, then apply migrations:

```bash
npm run db:migrate:local     # local SQLite for `wrangler dev`
npm run db:migrate:remote    # production D1
```

## Secrets

```bash
cp .dev.vars.example .dev.vars     # fill in for local dev (gitignored)
```

For production, set each with `wrangler secret put <NAME>` (see Appendix C):
`HF_API_KEY`, `HF_API_SECRET`, `HF_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`,
`POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`,
`CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`.

## Run

```bash
npm run dev          # wrangler dev → http://localhost:8787
npm run deploy       # wrangler deploy
npm run tail         # live logs
```
