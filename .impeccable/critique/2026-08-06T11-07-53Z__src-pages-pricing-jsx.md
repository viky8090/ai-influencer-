---
target: marketing funnel (how-it-works, earnings, pricing)
total_score: 24
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 2
timestamp: 2026-08-06T11-07-53Z
slug: src-pages-pricing-jsx
---
⚠️ DEGRADED: single-context (sub-agent session limit still in force)

Target: the marketing funnel — `/how-it-works` (163 lines), `/earnings` (175), `/pricing` (889). Mode: **Persuade**. All three inspected live at 1280x900.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Billing toggle and per-plan credit-tier selectors show state clearly |
| 2 | Match System / Real World | 3 | Plain, concrete language; the pricing FAQ answers real objections |
| 3 | User Control and Freedom | 3 | Monthly/Annual toggle and tier sliders are reversible and obvious |
| 4 | Consistency and Standards | 3 | All three share one Section/Eyebrow/H2 rhythm; the funnel reads as one property |
| 5 | Error Prevention | 3 | Checkout guards on `busy` state; little else can go wrong here |
| 6 | Recognition Rather Than Recall | 2 | Same defect as the landing page: credit counts (600, 1,800, 11,000) with no unit anchor — nothing states what one image costs |
| 7 | Flexibility and Efficiency | n/a | Persuade surface; no repeat-use accelerators are expected |
| 8 | Aesthetic and Minimalist Design | 2 | `/pricing` carries 986 DOM nodes: 4 plan cards with tier selectors + a full comparison table + 4 top-up packs + FAQ |
| 9 | Error Recovery | 2 | Checkout failure paths are not surfaced on-page |
| 10 | Help and Documentation | 3 | 4-item FAQ, plan footnotes, and an explicit "failed generations are never charged" line |
| **Total** | | **24/36** | **Good** (67%, bottom of band) |

H7 marked n/a per the Persuade mode-applicability rule; total renormalized to /36.

## Design Specificity Verdict

**Consistent and competent; specific only in its numbers.** The three pages share the landing page's section grammar, which is the right call for a funnel — the visitor should not feel a seam. Product-specific content is real: per-model premium gating ("Premium video (Seedance 2, Veo 3 Fast) requires Creator or higher"), the personal-vs-commercial licence split at the Creator tier, 12-month top-up expiry, and the refund-on-failure promise. Those are the sentences a competitor cannot copy.

The structure around them is category-standard: 4-tier cards + MOST POPULAR + comparison table + packs + FAQ.

**Deterministic scan:** `/how-it-works` and `/earnings` are **completely clean — 0 findings each.** `/pricing` returns 3: `bounce-easing` at 200 and 602, `layout-transition` at 602. All motion; deferred to the queued `animate` pass rather than being decided twice.

## What's Working

1. **Structural hygiene is the best in the codebase.** All three pages: exactly 1 `h1`, no level skips, **0 contrast failures** across every opaque-background text run, **0 interactive elements without an accessible name**. `/how-it-works` runs H1 → H2x7 → H3x3 → H2; `/earnings` H1 → H2 → H3x6 → H2x3. After decades of marketing pages built as div soup, this is genuinely rare.
2. **Astryx's `ClickableCard` is doing real accessibility work.** The four top-up packs render a 1x1 `clip: rect(0,0,0,0)` `<button>` carrying an `aria-label` ("500 credits for $21.99"). Verified with a REAL Tab keypress, not programmatic focus: `:focus-visible` matches and the parent 289x112 card takes `outline: solid 2px rgb(199,242,78)` via `:focus-within`. The pattern is complete — accessible name, keyboard reachability, and a visible ring on the element the user actually sees.
3. **The honest sentences are on the page, not buried.** "Failed generations? Never charged." and "Starter is personal-use only" both appear as plain statements rather than asterisks.

## Priority Issues

### [P1] `/pricing` had almost no heading structure — FIXED
Measured: 986 DOM nodes, **2 headings total** — the `h1` and "Compare plans in detail". The four plan names were `<span>` at 17px/700; "Need more? Top up anytime" and "FAQ" were `Text type="large" weight="bold"`. Visually a hierarchy, structurally flat. A screen-reader user browsing the conversion page by heading got the title and one table caption.
**Fixed** — plan names and both section headers are now real `h2` elements. Per CLAUDE.md the Astryx `<Heading>` component renders at a different scale and would have visibly shrunk the text, so each is a plain heading with `font: inherit` (the plan names use `display: contents` to avoid touching the card's flex layout). Verified: headings **2 → 8**, **0 level skips**, `scrollHeight` unchanged at exactly 3063px, 0 horizontal overflow, no DOM-nesting warnings. Zero visual change.

### [P1] Touch targets fail across the whole funnel — and these are the money buttons
Measured under 44x44: `/how-it-works` 33 of 37, `/earnings` 33 of 36, `/pricing` **31 of 31**. On `/pricing` specifically: every plan CTA ("Get Starter"/"Get Creator"/"Get Pro"/"Get Studio") is **255x32**; the credit-tier selectors are **34x13**; the Monthly/Annual toggle is 79x28.
This is the same systemic finding as the landing page, now confirmed site-wide rather than page-local: the shared nav (26-31px tall) and footer are the bulk of it, but the plan CTAs are page-owned and are the single most commercially important controls in the product. **Not fixed** — it needs one shared control-height decision applied across nav, footer and CTAs, not four local patches.

### [P2] Credits still have no unit anchor
`/pricing` sells 600 / 1,800 / 5,500 / 11,000 credits and $0.044-$0.032 per credit, and never states what one image or one video costs. The visitor cannot convert the number into value without leaving for the docs. Same defect flagged on the landing page; on the pricing page it is the actual purchase decision.

## Persona Red Flags

**Jordan (first-timer):** reaches `/pricing` and must choose among 4 plans x 3 credit tiers = 12 permutations, priced in a unit whose worth is never defined. The comparison table helps, but it arrives *below* the decision it is meant to inform.

**Casey (one-handed mobile):** `/earnings` is 4,853px and `/how-it-works` 3,974px of scroll with no in-page navigation. Every plan CTA is 32px tall against a 44px minimum.

## Minor Observations

- `/pricing` is 889 lines against 163 and 175 for its siblings — it carries five distinct content blocks and is the natural candidate for the next `distill` pass.
- The nav credit chip renders "— cr" in dev because the credits API 401s; on a marketing page a signed-out visitor sees a dash where a number belongs.
- A contrast "failure" I initially logged on that chip (ratio 1.00) was a **measurement artifact** — the walker resolved a translucent lime background rather than the opaque ancestor. Not a defect.

## Questions to Consider

1. You price in credits and never say what a credit buys. What would `/pricing` look like if every tier said "~180 images or ~22 videos" instead of "1,800 credits"?
2. `/earnings` argues the market is worth $46B and `/pricing` asks $5.99. Those two pages never link to each other's argument. Is the funnel one story or three?
3. `/how-it-works` and `/earnings` are detector-clean, single-h1, zero-contrast-failure pages built by the same hand as a 6,437-line studio with zero ARIA. What is different about how those pages get built, and can that be made the default?
