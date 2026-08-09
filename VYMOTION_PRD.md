# Vymotion — Product Requirements Document

| | |
|---|---|
| **Product** | Vymotion — AI influencer creation & content studio (paid SaaS) |
| **Built on** | A forked, now **wholly-owned** codebase (formerly an unlicensed "AI Influencer Studio" repo; all third-party attribution and affiliate hooks removed — see §17.6) |
| **Document version** | 1.0 (Draft for review) |
| **Date** | 2026-06-29 |
| **Owner** | viky (vikranty301@gmail.com) |
| **Status** | Proposed — pending stakeholder sign-off |
| **Target stack** | Cloudflare (Pages, Workers, D1, R2, KV, Queues, Durable Objects) + Polar.sh (Merchant of Record) |
| **Generation backends** | Higgsfield Platform API (image/video) · Anthropic Claude Opus 4.8 (prompt intelligence) |
| **Auth provider** | Clerk (managed identity, sessions, social login) |
| **Production domain** | `vymotion.org` (app) · `api.vymotion.org` (API + webhooks) |
| **Notifications email** | vikranty301@gmail.com (transactional sender TBD) |

> **How to read this doc.** Sections 1–6 are product framing. Section 7 is the as-built analysis of the open-source repo (the "analyse the repo" deliverable). Sections 8–11 are scope and functional requirements. Sections 12–15 are the technical architecture, data model, migration, and the UI redesign strategy. Sections 16–19 cover pricing, security/legal, scalability, and instrumentation. Sections 20–22 are the roadmap, risks, and open questions. Numbers in the pricing model are **calibration placeholders** clearly marked `⚠︎CALIBRATE` — they must be validated against the live Higgsfield API price sheet before launch.

---

## 1. Executive summary

Vymotion turns an open-source, "bring-your-own-account" AI influencer toolkit into a **managed, credit-metered SaaS product**. Today the open-source app stores everything in the browser, asks each user to connect their own Higgsfield account over OAuth, and asks them to paste their own Anthropic API key. There are no real accounts, no billing, and no server-side persistence.

Vymotion keeps **every existing creative feature** — influencer creation, character sheets, pose previews, the Photo Studio, the Video Studio, wardrobe, brand deals, and inspiration boards — but rebuilds the foundation underneath them:

- **Real accounts** (email/password + Google/Apple OAuth), profiles, and settings.
- **Platform-funded generation.** Vymotion holds the Higgsfield Platform API key and the Anthropic key server-side. Users never see an API key.
- **A credit system.** Every billable action — Claude prompt generation, image generation, video generation — debits credits from the user's balance. Credits come from a subscription plan and/or one-off top-up packs.
- **Subscriptions & payments** via **Polar.sh** — a Merchant-of-Record billing platform that also handles worldwide sales-tax/VAT/GST compliance (Free, Creator, Pro, Studio tiers + credit packs).
- **Server-side persistence and asset storage**, because the Higgsfield API only retains output files for ~7 days.
- **A full visual redesign** under the Vymotion brand, delivered **without breaking the existing component contracts and generation logic.**
- **A scalable, edge-native architecture** on Cloudflare.

The result is a product a non-technical creator can sign up for, pay for, and use to produce a consistent AI influencer's photo and video content — with predictable, transparent credit costs.

---

## 2. Background & context

### 2.1 The open-source starting point

"AI Influencer Studio" is a React + Vite single-page app. Its design philosophy is **local-first**: a user's influencers, photos, videos, brand deals, and inspiration boards all live in their own browser's `localStorage`. Image and video generation runs through the user's **own** Higgsfield account via an OAuth (PKCE) flow against `mcp.higgsfield.ai`, billed to the user's personal Higgsfield credits. Optional Claude features require the user to paste their **own** Anthropic API key, which is stored in `localStorage` and sent with each request through a thin serverless proxy.

The starting repository carried **no open-source license** and monetised only indirectly through a third-party Higgsfield **referral/affiliate** link fired during the connect flow. There is no first-party revenue, no user identity, and no shared infrastructure. **For Vymotion the affiliate link and all third-party attribution are removed and the codebase is taken fully private and owned** (see §17.6).

### 2.2 Why build Vymotion

The open-source model has three commercial ceilings:

1. **Friction.** Requiring each user to own a Higgsfield account and an Anthropic API key eliminates the majority of non-technical creators — the actual target market.
2. **No revenue capture.** Value accrues to Higgsfield (usage) and to a third-party affiliate, not to the product itself.
3. **No durability or trust.** Browser-only storage means a cleared cache wipes a user's entire body of work, and 7-day Higgsfield retention means assets silently disappear.

Vymotion resolves all three by becoming the **billing and storage system of record**: it buys generation capacity wholesale from Higgsfield and Anthropic, resells it as credits at a margin, and owns the user relationship, the data, and the assets.

### 2.3 What stays the same

The creative surface area — the prompt engineering, the model catalog, the wizard, the studios — is the product's moat and is **preserved verbatim** in behavior. This PRD treats the generation logic in `src/utils/*` and the page-level flows as a **fixed functional contract**; the work is to wrap, reskin, meter, and persist them, not to reinvent them.

---

## 3. Goals & non-goals

### 3.1 Goals

- **G1 — Accounts & identity.** Email/password and social sign-in, sessions, password reset, email verification, profile, and account settings.
- **G2 — Platform-funded credits.** All Higgsfield and Claude usage is funded by Vymotion's own API keys and metered to users as credits, with atomic debits and automatic refunds on failed/NSFW generations.
- **G3 — Subscriptions & monetisation.** Polar.sh-backed plans plus one-off credit packs, with a self-serve customer/billing portal and Merchant-of-Record tax handling.
- **G4 — Feature parity.** 100% of the current creative features work for a signed-in, credit-funded user.
- **G5 — Durable storage.** All user data and generated assets persist server-side; assets are copied off Higgsfield's 7-day CDN into Vymotion-owned storage.
- **G6 — Visual redesign.** A cohesive Vymotion brand and UI, shipped without regressing existing flows.
- **G7 — Scalability.** Architecture that handles thousands of concurrent generations without manual intervention, edge-native on Cloudflare.

### 3.2 Non-goals (v1)

- **Native mobile apps.** Responsive web only.
- **A public Vymotion API / developer platform.** Internal use only in v1 (revisit for the Studio tier).
- **Team/multi-seat collaboration.** Single-user accounts in v1; org/teams is a fast-follow.
- ~~**In-app social publishing** (auto-posting to TikTok/Instagram/etc.). Out of scope; export only.~~ **Superseded (2026-07-07):** shipped as **N13** — Postiz-backed publishing & scheduling, paid plans only (§12.8).
- **Training custom/fine-tuned models.** Vymotion uses Higgsfield's hosted catalog only.
- **Re-architecting `Influencers.jsx`.** Explicitly deferred (see §15.4); it is reskinned, not rewritten.

---

## 4. Success metrics

| Category | Metric | v1 target |
|---|---|---|
| Activation | % of signups that create their first influencer | ≥ 55% |
| Activation | % of signups that complete a first generation | ≥ 40% |
| Conversion | Free → paid conversion within 30 days | ≥ 6% |
| Revenue | Blended gross margin on generation (after Higgsfield + Anthropic COGS) | ≥ 60% |
| Retention | Paid logo retention at 3 months | ≥ 80% |
| Reliability | Generation success rate (non-NSFW, non-user-error) | ≥ 98% |
| Reliability | Credit-ledger discrepancies (debited but not delivered, or vice versa) | 0 unreconciled / week |
| Performance | p95 time-to-first-image (queue submit → first asset) | ≤ 60s |
| Trust | Support tickets citing "lost work" or "missing assets" | ≈ 0 |

---

## 5. Personas

- **Maya — the solo creator (primary).** Non-technical, wants a consistent AI persona to post fashion/lifestyle content. Will not own a Higgsfield account or an API key. Needs it to "just work," with clear costs and no surprise bills. Price-sensitive; starts on Free, upgrades to Creator.
- **Devon — the agency operator (secondary).** Runs several personas for clients, generates in volume, cares about throughput, 4K output, commercial licensing, and predictable monthly cost. Pro/Studio tier; the heaviest credit consumer.
- **Sam — the prosumer marketer (secondary).** Uses brand-deal mock-ups and product photoshoots to pitch clients. Values the Claude-powered product analysis and the brand-deal compositing.
- **Internal: Riley — operations/finance.** Needs the credit ledger to reconcile to the cent against Polar payouts/orders and Higgsfield/Anthropic spend, plus dashboards for margin and abuse.

---

## 6. Product principles

1. **Never show a user an API key.** Credits are the only currency the user sees.
2. **Charge only for value delivered.** Mirror Higgsfield's policy: failed and NSFW-rejected generations are never charged; held credits are released.
3. **Costs are legible before you spend.** Every generate button states its credit cost; the balance is always visible.
4. **The user's work is sacred.** Server-side persistence + owned asset storage; nothing disappears on a 7-day timer or a cache clear.
5. **Reskin, don't rewrite.** The creative engine is proven; the redesign changes how it looks and how it's gated, not what it does.

---

## 7. Current-state architecture analysis (as-built)

This section documents the repository as it exists, to anchor the migration plan.

### 7.1 Stack & layout

- **Frontend:** React 18, Vite 5, React Router 6. Single SPA, `src/main.jsx` → `src/App.jsx`.
- **Styling:** Inline styles driven by CSS variables (`var(--bg)`, `var(--text-primary)`, …). Theme tokens are set on `<html data-theme="dark|light">` by `src/context/theme.jsx`. There is **no** CSS framework and **no** component-library dependency.
- **Hosting:** Vercel. `api/*.js` are Vercel serverless/edge functions; `vite.config.js` mirrors them as dev proxies.
- **Dependencies (minimal):** `react`, `react-dom`, `react-router-dom`, `@vercel/analytics`. That's it — there is no state library, no data-fetching library, no auth, no DB client.

### 7.2 Routes & pages

| Route | File | Purpose | Size |
|---|---|---|---|
| `/` | `pages/Landing.jsx` | Marketing landing | 265 |
| `/influencers` | `pages/Influencers.jsx` | Profile + **Content Studio** + **Video Studio** | **6,391** |
| `/inspiration` | `pages/Inspiration.jsx` | Inspiration boards | 251 |
| `/brand-deals` | `pages/BrandDeals.jsx` | Brand-deal product character sheets | 419 |
| `/create` | `pages/Create.jsx` | Multi-step influencer creation wizard | 1,826 |
| `/settings` | `pages/Settings.jsx` | Higgsfield connect + Claude key + theme | 190 |
| `/auth/callback` | `pages/AuthCallback.jsx` | Higgsfield OAuth redirect handler | 70 |
| (component) | `pages/PhotoStudio.jsx` | Batch photo generation | 1,772 |

Total `src/` ≈ 16.7k lines. `Influencers.jsx` alone is ~38% of the codebase and is explicitly flagged in `CLAUDE.md` as fragile, tangled state that must not be casually refactored.

### 7.3 Data layer (localStorage)

`src/store.jsx` implements localStorage-backed React contexts:

- Each influencer is stored under its own key `hf_influencer_${id}`; an ordered `influencer_ids` array tracks sequence (this per-key design exists to survive quota errors without corrupting other influencers).
- Other keys: `photo_studio_history`, `inspiration_boards`, `brand_deals`, plus pending-generation queues (`hf_pending_gens`, `hf_pending_videos`, `hf_pending_photos_v2`) and a media-upload cache (`hf_media_cache`).
- A synchronous startup block migrates legacy data, frees quota by stripping base64 blobs from history, and re-seeds demo influencers (Kayla, Camila, Marcus) from `/seeds.json`.
- `generateId()` = `Date.now()` + random.

**Implication for Vymotion:** localStorage is doing the job of a database, an asset store, and a job queue simultaneously, and is already hitting quota limits (the code is full of quota-recovery hacks). This is the single biggest thing the migration replaces.

### 7.4 Generation & auth utilities

- **`utils/higgsfieldAuth.js`** — OAuth PKCE against `mcp.higgsfield.ai`: dynamic client registration, `code_challenge`/`verifier`, token + refresh-token storage in `localStorage`, silent refresh on focus, retry/backoff for the IP-based 429s that occur because all users egress through shared Vercel IPs. It also fired a third-party affiliate referral once per device — **this affiliate code is deleted in Vymotion** (§17.6) and the whole per-user OAuth surface is replaced by the platform-key model (§12.3).
- **`utils/higgsfieldGenerate.js`** (1,091 lines) — the MCP client: `initSession`, `callTool`, SSE stream parsing, media upload (`media_upload`→PUT→`media_confirm`), and the generators: `generateThreeImages`, `generateSingleImage`, `generateNImages` (Photo Studio batch), `generateVideo`, `generatePosePreviews`. Heavy polling logic (`pollAllJobs`, `pollVideoJobs`) with terminal-state handling for `completed/failed/nsfw/...`. Models referenced: `soul_2`, `gpt_image_2`, `nano_banana_2`, `nano_banana_flash`, `seedance_2_0`.
- **`utils/systemPrompt.js`** (1,321 lines) — the prompt engine: poses, wardrobe library, vibe palettes, model-specific variants, and a 3-tier prompt build where **Claude is "tier 2."**
- **Claude call sites:** `utils/backstoryAnalysis.js` (Haiku, backstory → style/niche tags) and `utils/charSheetPrompt.js` (`buildCharSheetPromptWithClaude`, Sonnet, vision analysis of a product image → structured JSON). Both `fetch('/api/claude', …)` with the user's key in the `x-api-key` header.

### 7.5 Serverless functions

| File | Role |
|---|---|
| `api/hf/[...path].js` | **Edge** proxy forwarding all traffic to `mcp.higgsfield.ai`, streaming SSE back (path-allowlisted to `/oauth2/`, `/mcp`, `/v1/`). |
| `api/claude.js` | Anthropic proxy; injects caller's `x-api-key`, forwards to `api.anthropic.com/v1/messages`. |
| `api/img-proxy.js` | Image proxy (CORS/CDN). |
| `api/search.js`, `api/hfproxy.js` | Auxiliary proxies. |
| `lib/rateLimit.js` | In-memory IP rate limiter (per-instance; not durable). |

### 7.6 Key constraints inherited from `CLAUDE.md`

- Never kill the Vite dev server (port 5173).
- `gpt_image_2` intentionally passes both resolution and quality — do not "fix" it.
- `Influencers.jsx` must not be casually refactored; any split needs a dedicated session with in-browser verification of every flow.
- Soul (`soul_2`) uses a simplified pose set (`POSES_SOUL`).

These constraints carry directly into Vymotion's redesign rules (§15).

---

## 8. Scope & feature parity

### 8.1 Carried-over features (must reach parity)

Every item below works today and must work identically in Vymotion (reskinned, account-gated, credit-metered, server-persisted).

| # | Feature | Source | Billable action(s) |
|---|---|---|---|
| P1 | Influencer creation wizard (multi-step: identity, look, backstory, palette) | `Create.jsx` | Claude backstory analysis; identity image gen |
| P2 | Claude "tier-2" backstory → style/niche enrichment | `backstoryAnalysis.js` | Claude prompt |
| P3 | Character turnaround sheet generation | `charSheetPrompt.js`, `Influencers.jsx` | Image gen |
| P4 | Pose previews (standing/sitting pose library) | `higgsfieldGenerate.generatePosePreviews` | Image gen (batch) |
| P5 | Photo Studio — batch photo generation w/ refs, wardrobe, props, locations | `PhotoStudio.jsx` | Image gen (batch) |
| P6 | Video Studio — image→video, audio, start-frame, multi-clip | `higgsfieldGenerate.generateVideo` | Video gen |
| P7 | Wardrobe slots & outfit references | `WardrobeDrawer.jsx` | Image gen |
| P8 | Brand Deals — product image → Claude analysis → product character sheet → composite | `BrandDeals.jsx`, `charSheetPrompt.js` | Claude prompt + image gen |
| P9 | Inspiration boards | `Inspiration.jsx` | none |
| P10 | Export / share card | `exportCard.js` | none |
| P11 | Light/dark theme | `context/theme.jsx` | none |
| P12 | Model selection (`soul_2`, `gpt_image_2`, `nano_banana_2`, `nano_banana_flash`, `seedance_2_0`) | `systemPrompt.js`, `higgsfieldGenerate.js` | varies by model |

### 8.2 New features (net-new for Vymotion)

| # | Feature | Section |
|---|---|---|
| N1 | Account auth (email/password + Google/Apple), email verification, password reset | §9.1 |
| N2 | User profile (display name, avatar, handle, bio, preferences) | §9.2 |
| N3 | Account & app settings (replaces "connect Higgsfield / paste Claude key") | §9.3 |
| N4 | Credit system: balance, ledger, holds, refunds, low-balance prompts | §10 |
| N5 | Plans & subscriptions + credit top-up packs (Polar.sh) | §11, §16 |
| N6 | Billing portal, invoices, payment methods | §11 |
| N7 | Dashboard / home (balance, recent generations, quick actions) | §15.5 |
| N8 | Server-side persistence + owned asset storage (R2) | §12, §13 |
| N9 | Generation history & "my library" across devices | §13 |
| N10 | Admin/ops console (ledger reconciliation, abuse, refunds) | §16.6, §19 |
| N11 | Usage metering & transparent per-action cost display | §10.4 |
| N12 | Legal: ToS, AI-content disclosure, likeness/deepfake policy, age gate | §17 |
| N13 | Social publishing & scheduling — connect channels, composer, calendar (Postiz-backed, paid plans only) | §12.8 |

### 8.3 Explicitly out (v1)

Teams/seats, native mobile, public API, model fine-tuning. (See §3.2. Auto-posting to social moved IN scope 2026-07-07 as N13/§12.8.)

---

## 9. Functional requirements — accounts, profile, settings

### 9.1 Authentication (N1)

**Replaces** the current model where "auth" means connecting a personal Higgsfield account. In Vymotion, auth is a first-party Vymotion account; Higgsfield/Anthropic are invisible backend providers.

Requirements:

- **FR-A1.** Sign up with email + password (min 10 chars, breached-password check) or via Google / Apple OAuth.
- **FR-A2.** Email verification required before the first paid action; unverified users may browse but not generate.
- **FR-A3.** Sessions are httpOnly, secure, SameSite cookies backed by server-side session records; access tokens are short-lived with refresh rotation.
- **FR-A4.** Password reset via emailed single-use, time-boxed token.
- **FR-A5.** Rate-limited, lockout-protected login; bot/abuse protection via Clerk's built-in defenses on signup/login.
- **FR-A6.** Account deletion (GDPR/CCPA): hard-deletes PII and assets, retains anonymised financial records for tax/audit.
- **FR-A7.** All authenticated API calls authorize the **resource owner** — every D1 query is scoped by `user_id`; no cross-tenant reads.

**Auth implementation — Clerk (decided).** Identity, sessions, email verification, password reset, social login (Google/Apple), and bot/abuse protection are handled by **Clerk**. The React SPA uses Clerk's components/SDK for sign-in/up; Workers verify Clerk-issued JWTs/session tokens on every `/api` call. D1 stores only a **mirror** of the user keyed by `clerk_user_id` (profile, plan, Polar customer id) — Clerk owns credentials and sessions, so Vymotion never stores password hashes. Clerk webhooks (`user.created`, `user.deleted`) keep the D1 mirror and credit grants in sync. Rationale: fastest path to production-grade auth, offloads security-sensitive surface, predictable per-MAU cost. (Trade-off and exit option noted in §20.)

### 9.2 Profile (N2)

- **FR-P1.** Editable: display name, unique handle, avatar (stored in R2), short bio, default niche, content preferences.
- **FR-P2.** Avatar upload is image-validated, size-capped, and served via Cloudflare image resizing.
- **FR-P3.** Profile is private by default (no public profile pages in v1).

### 9.3 Settings (N3)

The current Settings page (`Settings.jsx`) exposes three things: theme, **Connect Higgsfield**, and **paste Claude key**. In Vymotion:

- **FR-S1.** **Remove** the "Connect Higgsfield" and "Add Claude API key" controls entirely — these become server-managed and invisible.
- **FR-S2.** Keep the **Appearance** (light/dark) control.
- **FR-S3.** Add **Account** (email, password, connected social logins, delete account).
- **FR-S4.** Add **Billing** entry point (plan, credits, payment methods, invoices → §11).
- **FR-S5.** Add **Notifications** (email on generation complete, low-balance, receipts).
- **FR-S6.** Add **Defaults** (default model, default aspect ratio, default output resolution, NSFW-safe mode acknowledgement).
- **FR-S7.** Add **Data** (export my data, download my assets, delete my data).

> **Migration note.** A power-user "bring your own key" mode is explicitly **not** in v1 (the chosen model is platform-funded). The hooks are designed so it *could* be added later without schema changes (a nullable `byo_provider_key_ref` on the account), but no UI ships for it.

---

## 10. Functional requirements — the credit system (N4)

The credit system is the heart of Vymotion. It is an **accounting system**, not a counter, and must be correct to the credit.

### 10.1 The credit unit

- The internal unit is the **Vymotion Credit (VC)**, an integer. No fractional credits are ever stored; all costs round **up** to whole credits at debit time.
- A user's spendable balance = `subscription_credits + topup_credits` (see §10.5 for spend order and expiry).
- Retail anchor (for pricing math only): **1 VC ≈ $0.02** retail. `⚠︎CALIBRATE` against the live Higgsfield price sheet (see §16.1).

### 10.2 Per-operation credit costs

Costs are defined in a server-side **price book** (a versioned config table, never hard-coded in the client) so they can change without a deploy. Example v1 values:

| Operation | Backend | Unit | Cost (VC) | `⚠︎CALIBRATE` |
|---|---|---|---|---|
| Prompt intelligence (backstory analysis, brand-deal product analysis, prompt expansion) | Claude Opus 4.8 | per call (≤ ~2k tokens) | **1** | scale by tokens for long calls |
| Image — fast models (`nano_banana_flash`) | Higgsfield | per image | **2** | |
| Image — standard (`gpt_image_2`, `nano_banana_2`) | Higgsfield | per image | **4** | |
| Image — premium (`soul_2`, 2K/4K) | Higgsfield | per image | **6** | |
| Pose preview batch | Higgsfield | per preview image | **3** | charged per delivered image |
| Character / product sheet | Higgsfield | per sheet | **6** | composite is one image |
| Video — standard (`seedance_2_0`, ≤ 8s, 1080p) | Higgsfield | per clip | **20** | |
| Video — per extra second beyond 8s | Higgsfield | per second | **2** | |
| Video — 4K upscale | Higgsfield | per clip | **+10** | |

**Rules:**

- **FR-C1.** The cost of an action is computed server-side from the price book at submission time and **quoted to the client** before the user confirms (the Generate button shows "Generate · 4 cr").
- **FR-C2.** Batch actions (Photo Studio N images, multi-clip video, pose batches) are quoted and held as `N × unit`.
- **FR-C3.** Claude calls are metered by actual token usage when it materially exceeds the flat estimate; otherwise the flat cost applies.

### 10.3 Holds, settlement, and refunds (the ledger)

Vymotion mirrors Higgsfield's own policy (**failed and NSFW generations are auto-refunded; you are billed only for successful completions** — confirmed in the Higgsfield FAQ and webhook spec). The credit lifecycle:

1. **Quote** — client requests an action; server computes cost `C` from the price book.
2. **Hold** — server places a `hold` of `C` credits (balance check happens here; insufficient balance → `402` with an upsell). The hold is an authoritative reservation, not yet a spend.
3. **Submit** — server submits the job to the Higgsfield Platform API (with `hf_webhook` pointing at a Vymotion Worker) or calls Claude.
4. **Settle** —
   - On **`completed`**: convert the hold to a **debit**; write a `spend` ledger entry; copy the asset to R2; mark the generation delivered.
   - On **`failed` / `nsfw` / timeout / cancel**: **release** the hold (no charge); write a `release` ledger entry with the reason.
5. **Reconcile** — a periodic job verifies that every hold older than the model timeout has either settled or released; orphans are auto-released and alerted.

**Requirements:**

- **FR-C4.** The ledger is **append-only and double-entry-style**: every balance change is a row with `(user_id, kind ∈ {grant, hold, release, spend, refund, expire, adjust}, amount, balance_after, ref_type, ref_id, reason, created_at)`. Balance is derived/auditable from the ledger, with a cached materialised balance per user for fast reads.
- **FR-C5.** Holds and debits on a single user are **serialised** to prevent double-spend under concurrency (see §12.4 — a per-user Durable Object owns the balance).
- **FR-C6.** Refunds/releases are **idempotent** on the provider `request_id` (Higgsfield can retry a webhook for up to 2 hours; duplicate notifications must not double-refund).
- **FR-C7.** A user can never go negative; a race that would overspend is rejected at the hold step.
- **FR-C8.** Manual `adjust` entries (support credits, goodwill, abuse clawback) require an admin actor id and a reason, and are fully audited.

### 10.4 Transparency (N11)

- **FR-C9.** Persistent balance chip in the top nav, always visible to signed-in users.
- **FR-C10.** Every generate control shows its credit cost before commit; batch controls show the multiplied total.
- **FR-C11.** A **Usage** page lists every ledger entry with the linked generation, filterable by type and date, exportable to CSV.
- **FR-C12.** When a generation is refunded, the user sees an inline, non-alarming note ("No credits charged — generation didn't complete").

### 10.5 Grants, spend order, rollover, expiry

- **FR-C13.** Subscription plans **grant** credits on each successful billing cycle. Top-up packs grant credits immediately on payment.
- **FR-C14.** Spend order: **subscription credits first** (they expire), then **top-up credits** (longer-lived). This protects the user's purchased credits.
- **FR-C15.** Subscription credits **do not roll over** — they reset/expire at cycle end (configurable per plan; Pro/Studio may carry a capped rollover as a perk).
- **FR-C16.** Top-up credits expire **12 months** after purchase (`⚠︎CALIBRATE` / legal review per jurisdiction).
- **FR-C17.** On downgrade/cancel, already-granted top-up credits remain usable until expiry; subscription credits end at period end.

### 10.6 Free-tier abuse controls

- **FR-C18.** Free credits are granted once per verified identity (Clerk-verified email + device/IP heuristics) to deter multi-account farming.
- **FR-C19.** Free-tier outputs are watermarked and capped in resolution; commercial license requires a paid plan (§16.4).
- **FR-C20.** Velocity limits per account/IP on generation submission, independent of balance.

---

## 11. Functional requirements — plans & billing (N5, N6)

### 11.1 Payments provider — Polar.sh (Merchant of Record)

**Polar.sh** handles all billing: Checkout (subscriptions + one-off packs, via Checkout Links / embedded checkout / Checkout API), a hosted **customer portal** (plan changes, payment methods, invoices, cancellation), and **webhooks**. Crucially, Polar is a **Merchant of Record (MoR)** — it is the seller of record to the customer and **calculates, collects, and remits worldwide sales tax / VAT / GST**, so Vymotion carries no multi-jurisdiction tax-registration burden. Vymotion never touches card data (Polar-hosted checkout). Products (the four plans + four credit packs) are modelled in Polar; Vymotion maps each Polar product/price id to an internal plan/pack.

- **Integration:** Polar's TypeScript SDK and its **Hono adapter run natively on Cloudflare Workers** — the billing endpoints and webhook receiver are a Worker. (Polar also offers Next.js/Better Auth/etc. adapters; the Workers/Hono path is the fit for this stack.)
- **Trade-off:** MoR convenience costs more than a raw PSP — Polar's fee is **~5% + 50¢ per successful transaction** (vs ~2.9% + 30¢ for a bare gateway). This is folded into COGS and the margin target (§16.1).

### 11.2 Subscriptions

- **FR-B1.** Plans: **Free, Creator, Pro, Studio** (details in §16). Monthly and annual (annual = ~2 months free).
- **FR-B2.** Subscribing creates/updates a Polar subscription; the **`order.paid` / `subscription.active` webhook** (per Polar's webhook spec) is the trigger that grants the cycle's credits to the ledger (never the client).
- **FR-B3.** Upgrades grant the credit delta immediately; downgrades take effect next cycle (proration per Polar).
- **FR-B4.** Dunning: failed renewals are retried by Polar's dunning management; during grace the account drops to Free limits, not data loss.
- **FR-B5.** Cancellation keeps access until period end (`subscription.canceled` → revert to Free at period end); assets retained per retention policy §17.5.

### 11.3 Credit top-up packs

- **FR-B6.** One-off Polar checkouts that grant top-up credits on the `order.paid` webhook.
- **FR-B7.** Packs available to any tier including Free (so a Free user can buy a pack without subscribing).
- **FR-B8.** Volume discount built into pack pricing (§16.3).

### 11.4 Billing surfaces

- **FR-B9.** In-app Billing page: current plan, renewal date, credit balance + breakdown (subscription vs top-up), "buy credits," "change plan," and "manage payment methods / invoices" (deep-links to the **Polar customer portal**).
- **FR-B10.** Email receipts (Polar-issued) and low-balance warnings (at configurable thresholds, e.g. < 20 VC).
- **FR-B11.** All money/credit truth is server-side and webhook-driven; the client only ever **reads** balance and **requests** actions.

---

## 12. Technical architecture (Cloudflare)

### 12.1 Component overview

```
                          ┌──────────────────────────────────────────────┐
                          │                 Cloudflare                    │
  Browser (React SPA) ──► │  Pages (static SPA, Vymotion frontend)        │
        │  Clerk JWT      │                                                │
        │  fetch /api/*   │  Workers (API gateway + business logic)        │
        ▼                 │   ├─ auth         (verify Clerk JWT → user)   │
  ┌────────────┐          │   ├─ credits DO   (per-user balance, atomic)  │
  │   Clerk    │          │   ├─ generation   (quote→hold→submit)         │
  │  (identity)│          │   ├─ webhooks     (HF + Polar + Clerk)        │
  └────────────┘          │   └─ assets       (R2 signed reads)           │
                          │                                                │
                          │  D1 (SQL: user mirror, ledger, subs, gens)    │
                          │  KV (price book, rate limits, hot config)     │
                          │  R2 (owned asset storage: images/videos)      │
                          │  Queues (async generation + asset copy jobs)  │
                          │  Durable Objects (CreditAccount per user;      │
                          │                   GenerationJob coordinator)   │
                          └───────────┬───────────────────┬───────────────┘
                                      │                   │
                              Higgsfield Platform   Anthropic Claude
                              API (image/video)     (Opus 4.8)
                                      │                   │
                              Polar.sh MoR (billing/webhooks) ┘
```

### 12.2 Why Cloudflare fits

- **Edge-native + auto-scaling.** Workers scale horizontally with zero ops; matches Higgsfield's own "scales to thousands of concurrent operations" model.
- **Owned asset storage (R2)** with no egress fees — essential because Higgsfield deletes outputs after ~7 days, so Vymotion must copy every asset.
- **Durable Objects** give **strongly-consistent, single-threaded** per-user state — the correct primitive for a credit balance that must never double-spend.
- **Queues** decouple request submission from the slow (30s–9min) generation, so user requests return instantly.
- **D1** (SQLite at the edge) for relational truth: users, ledger, subscriptions, generations. **KV** for hot, read-mostly data (price book, session cache, rate-limit counters).
- The existing repo already uses **edge functions and SSE streaming** (`api/hf/[...path].js`), so the mental model carries over.

### 12.3 Generation pipeline (image/video)

The current client-side MCP polling (`higgsfieldGenerate.js`) moves **server-side** and switches from the MCP/OAuth surface to the **Higgsfield Platform REST API** (`https://platform.higgsfield.ai/{model_id}`, `Authorization: Key {key}:{secret}`).

End-to-end flow:

1. **Client → `POST /api/generate`** with `{ kind, model, params, count }`. No API keys; just the session cookie.
2. **Worker** validates input, computes cost from the price book, asks the user's **CreditAccount DO** to place a hold. Insufficient → `402`.
3. Worker creates a `generation` row (`status=queued`) and enqueues a job on **Cloudflare Queues**; returns `{ generation_id, cost, status: "queued" }` immediately.
4. **Queue consumer Worker** uploads any reference images to Higgsfield (or passes Vymotion R2 URLs), then `POST`s to the Platform API with `?hf_webhook=https://api.vymotion.org/webhooks/higgsfield&...`. Stores the returned `request_id` on the generation row.
5. **Higgsfield webhook → `POST /webhooks/higgsfield`** on `completed | failed | nsfw`:
   - `completed`: stream the asset from Higgsfield's CDN into **R2**, generate a thumbnail/poster, mark generation `delivered`, tell the CreditAccount DO to **settle** the hold (debit), write `spend` ledger entry.
   - `failed | nsfw`: mark generation accordingly, tell the DO to **release** the hold; write `release` entry. Idempotent on `request_id`.
6. **Client updates** via lightweight polling of `GET /api/generations/:id` **or** a server-sent events / WebSocket channel for live progress (replacing today's client polling). A safety **reconciler** (Cron Trigger) polls `status_url` for any job whose webhook never arrived.

> **Resilience parity.** Today's client has rich retry/backoff (429s), soft-terminal retries, IP-detected/likeness blocks, and pending-job resume across reloads. These behaviors are preserved but relocated to the queue consumer and reconciler, where they're more robust (no longer dependent on the tab staying open).

### 12.4 The CreditAccount Durable Object (§10.5, FR-C5)

- One DO instance per `user_id`. It owns the authoritative balance and serialises all `hold / settle / release / grant / expire` operations (single-threaded execution removes race conditions).
- Each mutation is written through to D1 (ledger append + materialised balance) for durability and audit; the DO keeps a hot in-memory copy for fast reads.
- Exposes: `quoteAndHold(cost, ref)`, `settle(holdId)`, `release(holdId, reason)`, `grant(amount, source, expiry)`, `expireDue()`, `balance()`.
- Holds carry a TTL = model timeout + buffer; the reconciler calls `release` on expired holds.

### 12.5 Claude (Opus 4.8) integration

- The current `api/claude.js` proxy (caller supplies key) is **replaced** by a Worker that injects Vymotion's **server-side** Anthropic key and meters usage.
- Default model is **`claude-opus-4-8`** for prompt-intelligence calls (backstory enrichment, brand-deal product analysis, prompt expansion), with a configurable cheaper fallback (Haiku) for trivial calls to protect margin — the model→credit mapping lives in the price book.
- Flow mirrors generation: quote → hold (flat 1 VC, or token-scaled) → call Anthropic → settle on success / release on error. Vision calls (product image analysis) pass the image as base64 exactly as `charSheetPrompt.js` does today.

### 12.6 Security architecture (summary; detail in §17)

- All provider secrets (Higgsfield key/secret, Anthropic key, Polar access token, webhook signing secrets) live in **Workers Secrets / environment bindings** — never in the client, never in D1.
- Webhooks verify signatures (Polar webhook secret; a shared secret or HMAC on the Higgsfield webhook path) and are idempotent.
- R2 objects are private; the client gets **short-lived signed URLs** via `GET /api/assets/:id`.
- Every data Worker authorizes by session `user_id`; D1 access is always tenant-scoped.

### 12.7 Provider abstraction — fal.ai fallback

The Higgsfield Platform account provisions only the Soul family, Popcorn Auto, and DoP video. The provider registry (`worker/src/providers/registry.js`) splits by capability: **Higgsfield owns character consistency** (any image generation with reference images → Popcorn multi-ref / Soul reference — the app's proven identity workflow), **fal.ai** (queue API, `https://queue.fal.run`) owns plain image generation with the *real* user-selected models and all video. The credit lifecycle (§10.3), webhook idempotency, and R2 asset copy are provider-agnostic and shared (`worker/src/lib/delivery.js`). The user-facing model catalog is unchanged from the original app; providers are invisible (P12, seamlessness), including in error copy — raw provider errors stay in D1/console, users see friendly text only (`src/api/serverGenerate.js`).

**Routing (capability split):**

| Case | Provider | Endpoint |
|---|---|---|
| image, any model, **refs present** | Higgsfield | `popcorn/auto` (`image_urls[]`) · `soul_2`+1 ref → `soul/reference` |
| image, `soul_2`, no refs | Higgsfield | `soul/standard` |
| image, `gpt_image_2`, no refs | fal.ai | `fal-ai/gpt-image-1/text-to-image` (`image_size`, `quality:high`) |
| image, `nano_banana_2`, no refs | fal.ai | `fal-ai/nano-banana-pro` |
| image, `nano_banana_flash`, no refs | fal.ai | `fal-ai/nano-banana` |
| video (`seedance_2_0`) | fal.ai | `fal-ai/bytedance/seedance/v1/lite/{text,image}-to-video` |
| `prompt` | Anthropic | Claude (§12.5) |

- Submission registers `?fal_webhook=` → `POST /webhooks/fal`; payload `{ request_id, status: OK|ERROR, payload: { images|video } }`. fal has no distinct `nsfw` status — content-policy rejections arrive as `ERROR` and release the hold (never charged), consistent with §10.3.
- v1 video limitation: the Seedance path takes one start image and no audio track; the Video Studio's extra product refs / audio upload remain client-side-only until a multi-ref video model is added.
- The cron reconciler polls the owning provider before releasing a stuck hold; a lost completion webhook is delivered from the provider's status/result endpoints instead of refunded.
- Secret: `FAL_API_KEY` (Workers Secrets, Appendix C). fal webhook signature (ED25519 + JWKS) is a Phase-5 hardening item alongside the Higgsfield HMAC.
- ⚠︎CALIBRATE: fal COGS for `nano_banana_flash` (~$0.039/image) makes the 2 VC price near margin-zero — reprice via `price_book` or accept as loss-leader (§5 targets ≥60% blended margin).

### 12.8 Social publishing — Postiz backend (N13, added 2026-07-07)

Publishing/scheduling is powered by a **self-hosted, unmodified [Postiz](https://github.com/gitroomhq/postiz-app)** instance (AGPL-3.0; NestJS + Next.js + PostgreSQL + Redis + Temporal — runs as Docker on the owner's server at `postiz.vymotion.org`, deploy runbook in `worker/postiz/README.md`). The Worker is its **only** caller, via the Postiz Public API (`/api/public/v1/*`, key in the `POSTIZ_API_KEY` secret, base in `POSTIZ_API_BASE`). Keeping Postiz unmodified behind an API boundary satisfies the AGPL while Vymotion's code stays proprietary; users never see Postiz (provider invisibility, §12.7).

- **Multi-tenancy:** ONE Postiz organization holds every connected channel. D1 maps `postiz_integration_id → user_id` (`social_channels`, migration 0010) and every `/api/social/*` route enforces ownership. Channel connect uses a pending-claim flow: snapshot org integrations → issue OAuth URL (`GET /social/{platform}`) → popup → poll-claim the newly appeared integration for the requesting user (`social_pending_connects`, 15-min TTL; UNIQUE constraint arbitrates races).
- **Gating:** paid plans only (creator/pro/studio, active/past_due). No credit metering — posting is free on paid plans; free users see an upsell.
- **Posts:** Worker `/api/social/posts` uploads R2 public asset URLs into Postiz via `upload-from-url` (cached in `postiz_media`), builds the per-platform `settings.__type` payload, and records `social_posts`. States sync by polling `GET /posts` (the Public API has no outbound webhooks) — live on page load, and via the 5-min cron for overdue scheduled posts (`syncSocialPosts`).
- **Platforms:** v1 = X, LinkedIn, Pinterest (OAuth-connectable via the public API). Bluesky/Mastodon need Postiz-UI credential forms (not exposed). Instagram/Facebook/Threads (Meta), TikTok, YouTube activate by adding their app credentials to the Postiz env after platform reviews — zero Worker changes.
- **UI:** `/publish` page (calendar + channels rail + composer), "↗ Post" buttons on publishable assets (Lightbox, ImageGrid, Dashboard), Settings "Social channels" section. Only `/public/`-hosted asset URLs are publishable (Postiz must fetch them; blob:/data: URLs are filtered out; the Worker SSRF-guards media URLs to its own `/public/` origin).

---

## 13. Data model & asset storage (N8, N9)

### 13.1 D1 schema (core tables)

```sql
-- Identity ------------------------------------------------------------
-- Identity is owned by Clerk. D1 stores only a mirror; no passwords, no sessions.
users(
  id TEXT PRIMARY KEY,                 -- ULID (internal)
  clerk_user_id TEXT UNIQUE NOT NULL,  -- maps to Clerk; populated via Clerk webhook
  email TEXT UNIQUE NOT NULL,
  display_name TEXT, handle TEXT UNIQUE, avatar_r2_key TEXT, bio TEXT,
  default_model TEXT, default_aspect TEXT, default_resolution TEXT,
  polar_customer_id TEXT,
  status TEXT DEFAULT 'active',        -- active|suspended|deleted
  created_at INTEGER, updated_at INTEGER
);
-- (Sessions, social OAuth links, email verification, password reset = Clerk-managed.)

-- Billing -------------------------------------------------------------
subscriptions(
  id, user_id, polar_subscription_id, plan TEXT,                  -- free|creator|pro|studio
  status TEXT, current_period_end INTEGER,
  cancel_at_period_end INTEGER, created_at, updated_at
);
price_book(                              -- versioned; also mirrored to KV
  id, version INTEGER, operation TEXT, model TEXT, unit TEXT,
  cost_vc INTEGER, active INTEGER, created_at
);
polar_products(                          -- maps Polar product/price ids → plan or pack
  polar_product_id TEXT, polar_price_id TEXT, kind TEXT,          -- plan|pack
  plan_or_pack TEXT, grant_vc INTEGER, created_at
);

-- Credits (append-only ledger) ---------------------------------------
credit_ledger(
  id, user_id,
  kind TEXT,                            -- grant|hold|release|spend|refund|expire|adjust
  amount INTEGER,                       -- signed
  balance_after INTEGER,
  bucket TEXT,                          -- subscription|topup
  ref_type TEXT, ref_id TEXT,           -- e.g. generation:<id>, polar:<order>
  reason TEXT, actor TEXT,              -- system|user|admin:<id>
  expires_at INTEGER, created_at INTEGER
);
credit_balance(user_id PRIMARY KEY, subscription_vc INTEGER,
               topup_vc INTEGER, updated_at);   -- materialised cache

-- Creative domain (was localStorage) ---------------------------------
influencers(
  id, user_id, name, gender, type, age, niche, backstory, physical_desc,
  clothing_style, palette_json, voice, intro_extrovert,
  main_image_asset, character_sheet_asset, closeup1_asset, closeup2_asset,
  data_json,                            -- flexible bag for fields not promoted to columns
  created_at, updated_at, deleted_at
);
wardrobe_slots(id, influencer_id, name, image_asset, created_at);
brand_deals(id, user_id, influencer_id, brand, category,
            product_asset, sheet_asset, images_json, created_at);
inspiration_boards(id, user_id, title, items_json, created_at, updated_at);

generations(
  id, user_id, influencer_id,
  kind TEXT,                            -- image|video|pose|sheet|prompt
  model TEXT, params_json,
  provider TEXT,                        -- higgsfield|anthropic
  provider_request_id TEXT,             -- idempotency key for webhooks
  status TEXT,                          -- queued|in_progress|delivered|failed|nsfw|cancelled
  cost_vc INTEGER, hold_id TEXT,
  output_assets_json,                   -- R2 keys
  error TEXT, created_at, delivered_at
);
assets(
  id, user_id, r2_key, kind, content_type, bytes,
  width, height, duration_s, thumb_r2_key,
  source_generation_id, created_at
);
webhook_events(id, provider, provider_request_id, payload_json,
               processed_at, UNIQUE(provider, provider_request_id));  -- dedupe
```

### 13.2 Asset storage (R2)

- **FR-D1.** On any `completed` generation, the asset is copied from Higgsfield's CDN to R2 **before** the user is told it's ready — Higgsfield retention is only ~7 days, so Vymotion must own the bytes.
- **FR-D2.** Keys are namespaced `users/{user_id}/{kind}/{asset_id}.{ext}`; objects are private.
- **FR-D3.** Reads are via short-lived signed URLs from `GET /api/assets/:id` (authorized to owner). Optional public share links are separately scoped, time-boxed tokens.
- **FR-D4.** Thumbnails/posters generated on ingest (Cloudflare Images or a transform Worker) for fast galleries.
- **FR-D5.** Lifecycle: deleted-account assets purged within 30 days; per-plan storage caps enforced (§16).

### 13.3 Migration of existing localStorage data

- **FR-D6.** A one-time **client-side importer**: on first login, if legacy `localStorage` keys (`hf_influencer_*`, `photo_studio_history`, `inspiration_boards`, `brand_deals`) are present, offer "Import your existing work." It POSTs the JSON to `/api/import`, which creates `influencers`/`generations`/`assets` rows and copies any reachable image/video URLs into R2.
- **FR-D7.** Demo seeds (Kayla/Camila/Marcus) become server-side template rows, optionally cloned into a new account for onboarding.
- **FR-D8.** Post-import, the server is the source of truth; localStorage is reduced to a UI cache only.

---

## 14. API surface (first-party)

All under `/api`, cookie-authenticated, tenant-scoped. Representative (not exhaustive):

| Method & path | Purpose |
|---|---|
| `POST /api/auth/signup` · `/login` · `/logout` · `/verify` · `/reset` | Auth |
| `GET/PATCH /api/me` | Profile & settings |
| `GET /api/credits` | Balance + breakdown |
| `GET /api/credits/ledger` | Paginated usage history (CSV export) |
| `POST /api/generate` | Quote → hold → enqueue a generation; returns `generation_id` + cost |
| `GET /api/generations/:id` | Status/result (poll) |
| `GET /api/generations?influencer=…` | Library / history |
| `GET /api/generations/:id/stream` | SSE live progress |
| `POST /api/generations/:id/cancel` | Cancel if still `queued` |
| `CRUD /api/influencers`, `/wardrobe`, `/brand-deals`, `/inspiration` | Creative domain |
| `GET /api/assets/:id` | Signed R2 URL |
| `POST /api/billing/checkout` · `/portal` | Polar Checkout / customer-portal session |
| `POST /api/billing/topup` | Buy a credit pack |
| `POST /webhooks/higgsfield` | Generation completion (signed, idempotent) |
| `POST /webhooks/polar` | Payments → grant credits / update subscription (MoR) |
| `POST /webhooks/clerk` | Identity sync (`user.created`/`updated`/`deleted`) → D1 mirror + free-credit grant |
| `GET /api/admin/*` | Ops console (role-gated) |

---

## 15. UI/UX redesign — Vymotion brand (G6)

The mandate is a full visual redesign **without breaking the code**. The repo's own `CLAUDE.md` warns that `Influencers.jsx` (6,391 lines) is fragile and must not be casually refactored. The strategy below reskins aggressively while touching tangled logic as little as possible.

### 15.1 The "reskin, don't rewrite" strategy

1. **Token-first.** The app already styles everything through CSS variables (`var(--bg)`, `var(--text-primary)`, …) set on `<html data-theme>`. Vymotion ships a **new design-token set** behind those *same variable names*, plus new tokens (`--brand`, `--brand-2`, `--radius`, `--elev-*`, `--font-display`). Re-theming the entire app is then largely a matter of redefining tokens in `theme.jsx` / `index.css` — **no component edits required** for the bulk of the restyle.
2. **Wrap, don't gut.** New top-level shell (nav, sidebar, balance chip, auth/billing modals) wraps the existing routed pages. Existing pages render inside the new shell unchanged.
3. **Stable contracts.** Keep the public signatures of `store.jsx` hooks (`useInfluencers`, `useInspirationBoards`, `useBrandDeals`) and every generator in `higgsfieldGenerate.js` (`generateThreeImages`, `generateNImages`, `generateVideo`, …). Their **implementations** change (server calls instead of localStorage/MCP), but **call sites in the pages don't.** This is the key to not breaking `Influencers.jsx`/`PhotoStudio.jsx`.
4. **Adapter layer.** Introduce `src/data/*` and `src/api/*` modules that expose the *same shapes* the pages already consume, so the pages are agnostic to whether data comes from localStorage (old) or the API (new). Swap the data source behind the adapter.
5. **Component primitives.** Add a small set of reusable primitives (`Button`, `Card`, `Modal`, `Field`, `Tabs`, `Toast`, `CreditChip`, `Paywall`) and migrate pages to them **incrementally**, lowest-risk pages first (Settings, Landing, Inspiration), highest-risk last (`Influencers.jsx`), each behind in-browser verification of every flow.
6. **No CSS framework swap mid-flight.** Stay with the inline-style + CSS-variable system to avoid a risky rewrite; optionally introduce CSS Modules for *new* components only.

### 15.2 Brand direction — flat, gallery-first (Higgsfield-style)

> **⚠️ Superseded (2026-07) by "Liquid Lime Glass".** The shipped UI is a full
> glassmorphism redesign: translucent `backdrop-filter` surfaces over a fixed
> aurora-blob ambient background, a floating glass nav pill, and a wholly new
> "liquid motion" system (blur-condensation reveals, cursor-refraction tilt,
> jelly presses, morphing-blob loaders, a liquid-droplet theme transition, and a
> word-morph hero). The electric-lime `#C7F24E` accent and the token contract
> below are preserved; the "no gradients / no glassy blurs / flat radii /
> hover-lift motion" rules in this section are intentionally reversed. Design
> lives in `src/index.css`, `src/ui/glass.js`, and `src/components/AmbientBackground.jsx`.
> The flat gallery-first spec below is retained for historical context only.

The visual reference is the **Higgsfield homepage**: a dense, edge-to-edge gallery of real generated media on a near-black canvas, a thin flat top nav, and a single high-energy accent. The work itself is the design — the UI gets out of the way.

**Hard design rules (per direction):**

- **No gradients, anywhere.** Flat solid fills only — surfaces, buttons, badges, accents. (This removes the existing pink→purple gradient logo and the violet/magenta button gradients in `Nav.jsx`.)
- **No "AI slop."** No generic AI-generated filler illustrations, no glassy blurs-for-decoration, no stocky hero art. Imagery on the site is **real user/curated output** in a justified grid; chrome is restrained and typographic.
- **Content-forward, dark canvas.** Near-black background (`--bg ≈ #0A0A0B`), media tiles do the talking.

**Tokens:**

- **Name/identity:** Vymotion — "vy" + "motion." New flat wordmark + minimal monoline glyph; solid colour, no gradient.
- **Surfaces:** `--bg` near-black; `--surface` slightly raised flat grey; `--border` hairline low-contrast.
- **Accent:** one solid, high-chroma **electric-lime / chartreuse** (`--brand ≈ #C7F24E`) used sparingly for the primary CTA ("Sign up"), active nav item, and focus — exactly the Higgsfield accent role. A single secondary hot-pink (`--accent-2`) reserved for promo badges (e.g. a "30% OFF" pill), used only there.
- **Text:** near-white primary, mid-grey secondary; high contrast for WCAG AA.
- **Type:** a tight modern grotesk for the wordmark/headings (`--font-display`) + a clean neutral UI sans (`--font-ui`). Compact, confident, not decorative.
- **Shape & motion:** small flat radii (`--radius ≈ 8–10px`), no heavy shadows; transitions are quick and functional (hover lift, tile reveal) — motion lives in the *content*, not in chrome effects.

> Light mode still ships (token contract preserved), but the **primary brand expression is the dark gallery**. The final palette/wordmark is a design deliverable; §15.6 ships a concrete homepage mockup of this direction.

### 15.3 Screen inventory

**New screens:** **Explore homepage** — a Higgsfield-style edge-to-edge justified/masonry grid of curated showcase output under the flat top nav (public, signed-out; this *is* the landing page); Clerk-hosted sign up / log in / verify / reset; onboarding (create first influencer + grant free credits); **Dashboard/Home** (balance, recent generations, quick actions); Pricing/Plans; Billing; Usage/Ledger; Profile; redesigned Settings; low-balance/paywall modal; generation-complete toasts.

**Re-themed existing screens (behavior unchanged):** Influencers (profile + Content Studio + Video Studio), Create wizard, Photo Studio, Brand Deals, Inspiration. Each gains the credit chip, per-action cost labels, and the new shell.

### 15.4 Hard constraints (do-not-break list)

- Do **not** refactor `Influencers.jsx` structurally during the reskin; restyle via tokens + wrapper components only. A structural split is a separate, later, dedicated effort (matches `CLAUDE.md`).
- Preserve `gpt_image_2` passing both resolution and quality.
- Preserve Soul's simplified pose set (`POSES_SOUL`).
- Preserve all generation **inputs/outputs and prompt templates** in `systemPrompt.js` — the redesign never alters prompt content.

### 15.5 Dashboard (N7)

Signed-in home: current credit balance + plan, "Generate" quick actions, recent generations grid (from R2), influencers carousel, low-balance nudge, and onboarding checklist for new users.

### 15.6 Homepage mockup (deliverable)

A concrete, single-file HTML mockup of the **Explore homepage** in this direction ships alongside this PRD at `design/vymotion-home-mockup.html`: flat near-black canvas, hairline top nav (Explore · Image · Video · AI Influencer · Photo Studio · Brand Deals · Inspiration · Pricing · Login · solid-lime **Sign up**), a justified media grid, and the single lime accent + one pink promo pill — **no gradients, no AI-slop filler**. Tiles are neutral flat placeholders standing in for real curated output (the real grid is populated from R2). It exists to validate the visual language before engineering builds the token set.

---

## 16. Pricing & monetisation model (detailed)

> All figures `⚠︎CALIBRATE` — finalise after pulling the live Higgsfield API price sheet (FAQ confirms per-model pricing visible in the Higgsfield Cloud dashboard) and measuring real Claude Opus token costs. The **structure** is the deliverable; the **numbers** are starting points targeting ≥ 60% blended gross margin.

### 16.1 Cost basis & margin logic

Vymotion's COGS per action = Higgsfield credit cost (image/video) or Anthropic token cost (prompt), **plus the Polar Merchant-of-Record fee (~5% + 50¢ per transaction) amortised across the credits in each purchase**. Retail VC price is set so that `retail_VC_cost ≥ COGS / (1 − target_margin)`. With a $0.02/VC anchor and the §10.2 costs, an image at 4 VC = $0.08 retail, a standard video at 20 VC = $0.40 retail, a prompt at 1 VC = $0.02 retail. Because Polar's per-transaction fee is fixed-plus-percentage, **larger top-up packs and annual plans carry better margin** than small one-off purchases — a factor in pack sizing (§16.3). The price book lets finance tune any single operation without code changes.

### 16.2 Subscription tiers

| | **Free** | **Creator** | **Pro** | **Studio** |
|---|---|---|---|---|
| Price (mo) `⚠︎` | $0 | $19 | $49 | $149 |
| Price (yr) `⚠︎` | — | $190 | $490 | $1,490 |
| Monthly credits `⚠︎` | 30 (one-time 50 bonus) | 1,200 | 3,500 | 12,000 |
| Influencers | 1 | 5 | 25 | Unlimited |
| Max image resolution | 1K, watermarked | 2K | 4K | 4K |
| Video | ❌ (preview only) | ✅ 1080p | ✅ 1080p + 4K upscale | ✅ 4K |
| Queue priority | low | standard | high | highest |
| Commercial license | ❌ | ✅ | ✅ | ✅ |
| Asset storage cap `⚠︎` | 1 GB | 25 GB | 100 GB | 500 GB |
| Credit rollover | none | none | capped (1 mo) | capped (2 mo) |
| Support | community | email | priority email | priority + onboarding |

### 16.3 Credit top-up packs (any tier)

| Pack | Credits `⚠︎` | Price `⚠︎` | Effective $/VC |
|---|---|---|---|
| Small | 500 | $12 | $0.024 |
| Medium | 1,500 | $30 | $0.020 |
| Large | 5,000 | $90 | $0.018 |
| Mega | 15,000 | $240 | $0.016 |

Top-up credits expire in 12 months (§10.5) and are spent **after** subscription credits.

### 16.4 Licensing & watermarks

- Free outputs are watermarked, 1K max, personal-use only.
- Paid tiers remove the watermark and grant a commercial-use license for generated assets (subject to the likeness/deepfake policy §17.3 and Higgsfield's upstream terms).

### 16.5 Promo / growth levers

- Referral: inviter and invitee each get bonus credits on the invitee's first paid action.
- Annual prepay discount (~2 months free).
- Occasional credit bonuses on first top-up.

### 16.6 Finance reconciliation (internal)

- **FR-M1.** A daily job reconciles: Polar orders/payouts (net of MoR fees + tax) ⇄ credits granted ⇄ credits spent ⇄ Higgsfield+Anthropic spend, surfacing blended margin and any ledger drift.
- **FR-M2.** Alerts on negative-margin operations (a price-book entry whose COGS exceeded its VC price after an upstream price change).

---

## 17. Security, privacy & legal

### 17.1 Secrets & keys

- Higgsfield key/secret, Anthropic key, Polar access token, and webhook signing secrets live only in **Workers Secrets**. They are never sent to the browser, never logged, never stored in D1. This is the central security difference from the open-source app, where the user's keys lived in `localStorage`.
- Key rotation runbook; least-privilege; separate keys per environment (dev/stage/prod).

### 17.2 Application security

- Sessions: httpOnly + Secure + SameSite cookies; refresh-token rotation; server-side revocation.
- Clerk-managed signup/login hardening (bot protection, lockout); plus Vymotion-side velocity limits on generation.
- Webhook authenticity: Polar webhook-signature verification; HMAC/shared-secret verification on the Higgsfield webhook path; both idempotent via `webhook_events` dedupe.
- Strict per-tenant authorization on every query; no IDOR (object ids are ULIDs and ownership-checked).
- R2 private + signed URLs; share links are separate scoped tokens.
- Standard headers (CSP, HSTS), input validation, output encoding; dependency and secret scanning in CI.

### 17.3 Likeness, deepfake & content policy

- **Likeness protection.** The open-source generator already detects Higgsfield's "IP detected / protected likeness" responses; Vymotion surfaces these as clear user errors **and** enforces a ToS clause prohibiting generating real, identifiable people without rights. No celebrity/real-person likeness.
- **NSFW.** Higgsfield's moderation flags NSFW and refunds it; Vymotion adds its own input checks, logs flags, and applies progressive enforcement (warn → suspend) for repeat violations.
- **Provenance.** AI-generated content is labelled; consider C2PA content credentials on exports (fast-follow).
- **CSAM/illegal content:** zero tolerance; automated detection + reporting obligations.

### 17.4 Privacy & compliance

- GDPR/CCPA: data export and deletion (FR-A6, FR-S7), lawful-basis records, DPA with subprocessors (Higgsfield, Anthropic, Polar, Clerk, Cloudflare), cookie consent.
- Age gate (18+) appropriate to AI-likeness content.
- Clear privacy policy describing what is sent to Higgsfield/Anthropic and retention.
- PCI & tax: Polar is the **Merchant of Record** — it hosts checkout (Vymotion never handles card data) and calculates/collects/remits worldwide VAT/GST/sales tax, removing Vymotion's multi-jurisdiction tax-registration burden. Vymotion remains responsible for its own corporate income tax and for accurate product/pricing data.

### 17.5 Data retention

- User assets retained while the account is active and for a defined grace window after cancellation; purged within 30 days of account deletion.
- Financial/ledger records retained per tax/audit law even after account deletion (anonymised link to a deleted user).
- Higgsfield's own 7-day output retention is irrelevant to users because Vymotion copies assets to R2 immediately (§13.2).

### 17.6 Intellectual property & ownership (decided)

- **Direction:** Vymotion is taken **fully private and wholly owned**. All third-party branding, attribution, author credits, and the affiliate referral code from the original repo are **stripped**: delete the affiliate link and any `fpr=`/referral logic in `higgsfieldAuth.js`, remove "Influencer Studio" naming and author credits from `README.md`/`SETUP.txt`/`Nav.jsx`/`package.json`, and rebrand to Vymotion throughout.
- **Concrete removal checklist:** affiliate `window.open(...fpr=...)` + `fireReferralOnce` + `hf_referral_fired`; `client_name: 'AI Influencer Studio'` → `'Vymotion'`; feedback-form link; any upstream repo URLs in docs.
- **Honest legal caveat (not legal advice).** "Unlicensed" code means the original author granted **no** license — under default copyright, all rights are reserved to them, which is *more* restrictive than open-source, not less. Treating the fork as wholly owned should be confirmed with counsel (e.g. obtain an explicit assignment/permission from the original author, or establish clean-room/independent-creation provenance) before commercial launch. Vymotion is not a lawyer; this is a flagged risk in §20, not a clearance.

---

## 18. Scalability, reliability & observability (G7)

- **Stateless Workers** scale automatically at the edge; no instance management.
- **Async-by-default**: request submission returns instantly; slow generation runs through **Queues**, so traffic spikes queue rather than fail. Concurrency caps + backpressure protect upstream provider rate limits.
- **Strong consistency where it matters** (credits) via per-user Durable Objects; **eventual/cached** where it's cheap (price book, balance reads) via KV.
- **Provider resilience:** retry/backoff for Higgsfield 429/5xx (ported from the existing client), circuit breaker when a provider is degraded, and the **webhook + reconciler** combination so no result is lost if a tab closes or a webhook is missed.
- **Idempotency** everywhere money/credits move (Polar events, Higgsfield webhooks, generation settlement) keyed on provider ids.
- **Caching/CDN:** R2 + Cloudflare cache for asset delivery; signed URLs.
- **Observability:** structured logs, Workers Analytics Engine for metrics (generation latency, success rate, credit drift), error tracking (Sentry), uptime checks, and dashboards for the §4 KPIs. Alerting on success-rate drops, ledger drift, negative margin, queue depth, and webhook failures.
- **DR:** D1 backups/point-in-time; R2 durability; documented restore runbook; staging environment mirrors prod.

---

## 19. Analytics, instrumentation & admin

- **Product analytics:** funnel events (signup → first influencer → first generation → first paid), activation, retention, feature usage, conversion. Privacy-respecting (first-party, consent-gated).
- **Credit analytics:** spend by operation/model, refund rate, average credits/user, balance distribution.
- **Admin/ops console (N10):** look up a user, view their ledger, issue goodwill credits (audited `adjust`), inspect a generation and its provider `request_id`, replay/settle a stuck job, suspend abusive accounts, view margin and reconciliation dashboards. Role-gated, fully audited.

---

## 20. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Upstream price changes** erode margin | High | Price book decoupled from code; daily margin reconciliation + alerts (§16.6); ability to reprice instantly. |
| **Credit ledger bugs** (double-spend / lost refunds) | High | Durable-Object serialisation, append-only double-entry ledger, idempotency, nightly reconciler, automated tests on the credit engine. |
| **Higgsfield API differs from the MCP surface** the app uses today | High | Platform REST API confirmed (auth, async queue, webhooks, refunds). Build a provider adapter; keep the prompt/param builders intact; integration-test each model (`soul_2`, `gpt_image_2`, `nano_banana_2/flash`, `seedance_2_0`) against the REST API early. |
| **Breaking `Influencers.jsx`** during reskin | High | Token-first restyle + stable hook/generator contracts + adapter layer; no structural refactor; in-browser verification of every flow (§15). |
| **Asset loss** from Higgsfield's 7-day retention | High | Copy to R2 before marking delivered (FR-D1); reconciler catches misses. |
| **Auth via Clerk** (third-party dependency, per-MAU cost, vendor lock-in) | Med | Decided trade-off for speed/security. Keep auth behind a thin internal interface (verify-token + user-mirror) so Clerk could be swapped for an edge-native library later without touching business logic. |
| **IP/ownership of the unlicensed fork** | High | Original repo has no license = default copyright reserved to the author. Obtain explicit assignment/permission or establish clean-room provenance; strip all attribution/affiliate (§17.6); counsel sign-off before launch. |
| **Abuse / free-tier farming** | Med | Verified-identity grants (Clerk), velocity limits, watermarks, device/IP heuristics (§10.6). |
| **Likeness/deepfake misuse → legal/brand** | High | ToS, likeness policy, moderation, progressive enforcement, provenance labels (§17.3). |
| **Chargebacks / payment fraud** | Low/Med | As Merchant of Record, **Polar absorbs chargeback and payment-fraud handling**; Vymotion adds velocity checks before high-value spend and treats credits as non-cash-refundable per ToS. |
| **Vendor lock-in (Cloudflare/Higgsfield)** | Low/Med | Provider adapter for generation; standard SQL in D1; assets portable from R2. |

---

## 21. Rollout & phased roadmap

Phased so revenue-critical foundations land first and the fragile UI is touched last.

### Phase 0 — Foundations (infra)
Cloudflare project (Pages/Workers/D1/R2/KV/Queues/DOs), CI/CD, environments, secrets, observability baseline. Provider adapter skeletons for Higgsfield REST + Anthropic.

### Phase 1 — Accounts & data backbone (MVP-internal)
Auth via **Clerk** (email/password + Google/Apple) + Clerk webhook → D1 user mirror, profile, settings shell, D1 schema. Move one generation path (image) server-side end-to-end. **localStorage → server adapter** in place. No payments yet (credits granted manually for testing).

### Phase 2 — Credits & billing
CreditAccount DO, ledger, holds/refunds, price book. Polar.sh products (plans + packs) + checkout + webhooks + customer portal. Usage page. Free-tier abuse controls.

### Phase 3 — Full generation parity
All flows server-side & metered: Photo Studio batch, Video Studio, pose previews, character/product sheets, brand deals, Claude Opus prompt intelligence. R2 asset pipeline + library + reconciler. Integration-test every model.

### Phase 4 — Vymotion redesign
Token set + brand, new shell/nav/dashboard, credit chip + cost labels, paywall/low-balance modals, re-themed pages (lowest-risk → `Influencers.jsx` last) with per-flow verification. Marketing landing + pricing page.

### Phase 5 — Migration, hardening & GA
localStorage importer for existing users, legal (ToS/privacy/likeness/age gate), security review, load/perf test, finance reconciliation dashboards, admin console. Closed beta → public GA.

> Fast-follows after GA: teams/seats, public API (Studio), social publishing, C2PA provenance, BYO-key power mode.

---

## 22. Open questions

### 22.1 Resolved decisions

| # | Decision |
|---|---|
| Brand/visual | Flat, gallery-first, **Higgsfield-style** homepage. **No gradients, no AI slop.** Dark canvas + single solid electric-lime accent + one pink promo pill. Mockup at `design/vymotion-home-mockup.html` (§15.2, §15.6). |
| Domain & email | App `vymotion.org`, API/webhooks `api.vymotion.org`. Notifications to vikranty301@gmail.com; transactional sender (Resend/Postmark) TBD. |
| Higgsfield affiliate | **Removed.** Affiliate code and all `fpr=`/`dankieft`/attribution stripped; platform-key model replaces per-user OAuth (§17.6). |
| Auth | **Clerk** (managed identity/sessions/social), D1 stores a mirror (§9.1, §13.1). |
| Payments | **Polar.sh** — Merchant of Record (handles worldwide tax, hosted checkout, customer portal, dunning, chargebacks). Integrated on Workers via Polar's Hono adapter (§11.1). |
| Licensing/ownership | Codebase taken **wholly private and owned**; all attribution removed. Legal caveat flagged (unlicensed = default copyright reserved) → counsel sign-off (§17.6, §20). |

### 22.2 Still open

1. **Exact credit numbers:** finalise §10.2 / §16 after measuring real COGS (Higgsfield price sheet + Claude Opus tokens).
2. **Refund/expiry policy** for purchased credits per jurisdiction (consumer-law review).
3. **Geographic availability** at launch — sales tax/VAT is handled by Polar (MoR), so the open concerns narrow to content law, age-gating, and any regions Polar can't process.
4. **Transactional email provider** and the final wordmark/typeface (design pass).

---

## Appendix A — Higgsfield Platform API reference (as used by Vymotion)

- **Base URL:** `https://platform.higgsfield.ai`
- **Auth:** `Authorization: Key {api_key}:{api_key_secret}` (platform-level; server-side only).
- **Submit:** `POST /{model_id}` (e.g. `higgsfield-ai/soul/standard`) with prompt/params; optional `?hf_webhook=<url>`.
- **Status:** `GET /requests/{request_id}/status` · **Cancel:** `POST /requests/{request_id}/cancel` (only while `queued`).
- **Statuses:** `queued → in_progress → completed | failed | nsfw`. **`failed` and `nsfw` are auto-refunded and never charged.**
- **Webhooks:** POSTed on final status; retried up to **2 hours**; must be idempotent on `request_id`; respond `2xx` within ~10s.
- **Output retention:** ~**7 days** — Vymotion must copy assets to R2 (FR-D1).
- **SDKs:** official Python SDK; JS/TS "coming soon"; REST otherwise.

## Appendix B — Claude (Opus 4.8) usage map

| Call site (current) | Purpose | Vymotion model | Credit |
|---|---|---|---|
| `backstoryAnalysis.js` | backstory → style/niche tags | `claude-opus-4-8` (Haiku fallback for trivial) | 1 VC |
| `charSheetPrompt.buildCharSheetPromptWithClaude` | vision analysis of product image → JSON | `claude-opus-4-8` (vision) | 1 VC (token-scaled) |
| (new) prompt expansion / scene writing | richer prompt intelligence | `claude-opus-4-8` | 1 VC |

## Appendix C — Required secrets / environment bindings

`HF_API_KEY`, `HF_API_SECRET`, `HF_WEBHOOK_SECRET`, `FAL_API_KEY`, `ANTHROPIC_API_KEY`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, plus bindings for D1, R2, KV, Queues, and the `CreditAccount` / `GenerationJob` Durable Objects. (Sessions and bot protection are Clerk-managed; tax + card data are Polar-managed — so no `SESSION_SIGNING_KEY` and no card/tax secrets are needed.)

## Appendix D — Glossary

- **VC (Vymotion Credit):** the integer unit users spend.
- **Hold:** a reservation of credits during an in-flight generation; becomes a **spend** on success or is **released** on failure/NSFW.
- **Price book:** server-side, versioned mapping of operation/model → credit cost.
- **Settle / Release:** convert a hold to a charge / cancel a hold without charge.
- **Reconciler:** scheduled job that closes out holds whose webhook never arrived and verifies ledger integrity.
- **CreditAccount DO:** per-user Durable Object that serialises all balance changes.

---

*End of PRD v1.0 (draft). Numbers marked `⚠︎CALIBRATE` are placeholders pending live Higgsfield pricing and measured Claude costs.*





