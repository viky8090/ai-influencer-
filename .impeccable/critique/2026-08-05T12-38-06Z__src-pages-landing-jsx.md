---
target: / landing page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-05T12-38-06Z
slug: src-pages-landing-jsx
---
Method: dual-agent (A: a4a96f7c5d1957785 · B: a938feede81436870)

Target: `/` — src/pages/Landing.jsx (567 lines). Mode: **Persuade**.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 7,677px desktop / 12,222px mobile with no anchor nav or scroll affordance, despite 5 named section IDs the footer already deep-links to |
| 2 | Match System / Real World | 3 | Creator-native vocabulary is strong, but "200 credits/mo" never gets a unit anchor — no image cost stated anywhere on the page |
| 3 | User Control and Freedom | 1 | Measured live with `prefers-reduced-motion: reduce` active: marquee `animation-play-state: running`, h1 word still swaps every 2.6s. Pause is hover-only |
| 4 | Consistency and Standards | 2 | Two lime primaries adjacent in nav ("Create", "Sign up") doing different things; all 6 page CTAs are `<button>`, so no href, middle-click or new tab |
| 5 | Error Prevention | 2 | "No card required" vs the actual $5.99 generation paywall, disclosed only inside a collapsed FAQ answer |
| 6 | Recognition Rather Than Recall | 2 | Pricing block: 4 plans x 4 bullets, no shared comparison axis, credit counts the reader must divide by an unstated rate |
| 7 | Flexibility and Efficiency | 2 | No sticky mobile CTA — hero button exits at y≈577, next one at y≈8,405 |
| 8 | Aesthetic and Minimalist Design | 2 | 9 sections, 10 lime-filled CTAs, and one section carrying a line chart + per-second money counter + 3 stat pills + 4-row bar chart at once |
| 9 | Error Recovery | 2 | `ShowcaseCard` has no `onError`; `LazyVideo` sets no `poster` — 11 MB of clips render as flat #0D0D14 holes until decoded |
| 10 | Help and Documentation | 3 | Genuinely good: 7-item FAQ answering real objections, walkthrough link, docs, mailto |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

All ten heuristics scored; none marked n/a. H7 and H10 both genuinely apply here (a decided visitor needs a fast path; a first-timer needs the FAQ).

## Design Specificity Verdict

**Category-interchangeable.** A generic B2B SaaS could take this page, swap every word, delete the showcase, and ship it unchanged.

**LLM assessment:** The scaffolding is the canonical 2023-2026 SaaS hero beat for beat — badge-pill → rotating-word h1 → 20px sub → two buttons → three checkmark chips (Landing.jsx:45-118), then 4-across stat bar (299), numbered 4-step how-it-works (222-235), 3x2 icon feature grid (376-383), 3-up audience cards (392-406), 4-tier pricing with MOST POPULAR ribbon (422-500), split FAQ accordion (509), centered final CTA, 4-column footer. Section rhythm is literally uniform: every section is `80px 24px` + 1px hairline + Eyebrow/H2/Lead/grid (marketing.jsx:75-87).

Exactly two things are product-specific: the Camila showcase wall (124-219) — one persona held across 25 photo *and* video frames, each tagged by originating studio, stills and loops mixed in one strip — and the headline over it, "One persona. Every frame." (202). No other category could reuse that composition, and the tags do double duty as a feature list. The AI-influencer product is present as subject matter, not as design language.

**Deterministic scan:** 2 findings, both confirmed, zero false positives. Rule `layout-transition` fired twice — Landing.jsx:258 (`transition: max-height` on the FAQ panel) and charts.jsx:95 (`transition: width` on TierBars). Both are real layout-property animations. The detector is close to clean; the material problems on this page are ones a static scanner cannot see, which is why the browser pass carried the weight.

**Visual overlays:** not attempted. Screenshots time out on this app (ambient canvas), and the browser pane held `document.visibilityState === "hidden"` for the whole session, so no reliable user-visible overlay was available. Evidence is measured DOM/CSSOM data instead.

## Overall Impression

The page is competent, well-typeset and structurally sane — and it buries its only real argument. Vymotion's whole claim is *the same face, ten thousand times*, and the page proves that exactly once, at y=1001, below the fold on every device tested. Above it sits 900px of typography and a canvas dot field that is inert on touch (MouseDotField.jsx:306 early-returns for `pointerType === 'touch'`) while still running a rAF loop over ~400 dots every frame.

The single biggest opportunity: **move the proof above the fold and cut the second half of the page.**

## What's Working

1. **The Camila showcase (Landing.jsx:124-219).** 25 frames, stills and loops interleaved, each tagged by the studio that produced it. It proves identity consistency by demonstration rather than assertion, and the tags smuggle in a feature list without a feature list. Dropping the explanatory caption was right — the wall is the argument.
2. **"You're only charged for delivered generations; failed ones are always refunded" (Landing.jsx:420).** The most trust-building sentence on the page, because it names the precise fear of anyone who has burned credits on a generative tool. It is currently 420 lines down.
3. **Structural hygiene the detector and browser both confirm.** 26 headings, exactly 1 h1, zero level skips. Zero unnamed interactive elements across 50 desktop / 48 mobile controls. Zero horizontal overflow at 375px (218 elements extend past the right edge, all clipped by `.vy-marquee-mask` by design). `aspect-ratio: 2/3` inline on all 38 images → no measurable CLS from media. Console: 0 errors.
4. **The FAQ answers the uncomfortable question** ("Is this allowed — is it ethical?", marketData.js:80). Competitors dodge it; answering it is a sales asset.

## Priority Issues

### [P0] Nothing the product makes is visible above the fold
- **Why it matters:** This is a visual-output product sold to people who buy on visual quality. The hero spends its most valuable 900px on typography and a particle effect, then puts its only evidence below the fold where 40-60% of visitors never reach. Every persuasion dollar above the fold is spent on claims the visitor has no reason to believe yet.
- **Fix:** Two columns at ≥900px — copy left, a 3-card staggered Camila stack right (one card a `LazyVideo` with `poster` and `preload="metadata"`). Replace the `maxWidth: 720` centered block at Landing.jsx:70 with `display:grid; gridTemplateColumns:'1fr 0.85fr'` and left-align the copy. Below 900px collapse to copy-then-single-card and lift the marquee so ~120px peeks above the fold.
- **Suggested command:** `/impeccable bolder`

### [P0] `<button>` elements have no keyboard focus indicator anywhere in the app
- **Why it matters:** WCAG 2.4.7 AA failure on every button in the marketing site *and* the signed-in app. Keyboard users cannot see where they are. It is also a procurement blocker for the agency half of the audience, several of whom are EU entities with accessibility obligations.
- **Scope correction from the evidence:** Assessment A called this site-wide; the browser pass narrows it. Verified with real Tab keypresses, `<a>` elements DO show `outline: 2px solid rgb(199,242,78)`. `<button>` shows `outline-style: none, box-shadow: none` while `:focus-visible` matches true. Root cause is `src/index.css:207-213` — `button { outline: none }` unlayered, with no replacement. Grep over `src/` returns **zero `:focus-visible` selectors**. Since every page CTA on this route is a `<button>`, the practical impact is nearly total.
- **Fix:** Drop `outline: none` from index.css:211 and add, unlayered: `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: inherit; }`
- **Suggested command:** `/impeccable harden`

### [P1] Motion overrides the user's reduced-motion preference, with no pause control
- **Why it matters:** WCAG 2.2.2 (Pause/Stop/Hide) and 2.3.3. Two independent continuous animations — one inside the page's primary heading — that a vestibular-sensitive visitor cannot stop. Measured live: the test browser had `prefers-reduced-motion: reduce` matching true and `.vy-marquee` still computed `animation-play-state: running` (64s/72s infinite); `ping` and `pulse-dot` also kept running. `Reveal` (marketing.jsx:51) does honour it, so the pattern exists — it just wasn't applied here.
- **Nuance:** the marquee bypass is deliberate per the comment at Landing.jsx:551-552. The h1 morph (useWordMorph, 18-29) has no reduced-motion check at all — that one is an oversight.
- **Fix:** Return the static word from `useWordMorph` when reduce matches (this also makes the h1 deterministic for crawlers, which you want anyway). Add `@media (prefers-reduced-motion: reduce) { .vy-marquee { animation-play-state: paused } }` and one visible pause toggle on the showcase header.
- **Suggested command:** `/impeccable harden`

### [P1] `--m-faint` fails AA in dark mode across 29 elements — and it carries the reassurance
- **Why it matters:** The failing text is where the trust lives: "Free credits on sign-up · No card required", "STEP 1-4", "/month", "Estimates for illustration only… not a guarantee of income". Illegible reassurance is the worst outcome — you keep the legal exposure and lose the persuasion.
- **Measured:** dark `--m-faint: rgba(255,255,255,0.40)` → **3.77-3.83:1** on its various backgrounds, against a 4.5 requirement, across 10 distinct text variants / 29 element instances. The light theme was already corrected to `0.58` with a comment explaining this exact failure (index.css:86-88); the fix was never mirrored to dark. Separately MorphicNavbar.jsx:66 uses `--text-tertiary` for inactive nav items: **2.65:1** in light — below even the large-text threshold. One more light-mode failure: the "BEST VALUE" badge at 4.40:1.
- **Fix:** Set dark `--m-faint: rgba(255,255,255,0.58)` (≈5.9:1) — same value and reasoning as the light fix. Change MorphicNavbar.jsx:66 to `var(--text-secondary)`.
- **Suggested command:** `/impeccable audit`

### [P1] The pricing block is a second `/pricing` page pasted inline, and its buttons don't do what they say
- **Why it matters:** Two costs. It converts the page's clearest moment of momentum into a four-price comparison task — the classic top-of-funnel conversion killer — adding 794px and a 6-option decision point. And "Choose Creator" (Landing.jsx:487) calls `navigate('/pricing')` with **no plan state**: it is a selection affordance that selects nothing. A visitor who clicks "Choose Pro" and lands on an unselected page learns this site's buttons are decorative, which retroactively devalues every other CTA.
- **Fix:** Replace the four cards with one price strip — "From $5.99/mo · free to explore, no card · credits refunded on failed generations" — plus a ghost link to `/pricing`. If the cards must stay, at minimum pass `{ state: { plan: card.name } }` and relabel to "See Creator".
- **Suggested command:** `/impeccable distill`

### [P2] `See how it works` scrolls its target under the fixed nav
- **Why it matters:** This is the button for the *hesitant* visitor. Measured after the click, `#how` lands at `top: -32` and its eyebrow at `top: -31` — clipped behind the 56px fixed nav. Small, but it lands on exactly the wrong person, and it also affects the footer's five hash links.
- **Fix:** `section[id] { scroll-margin-top: calc(var(--nav-h) + 24px); }` in index.css.
- **Suggested command:** `/impeccable polish`

## Cognitive Load

**6 of 8 checks fail → CRITICAL.**

| Check | Result |
|---|---|
| Single focus | FAIL — the page argues persona-creation, market opportunity, feature breadth, business model and pricing in parallel |
| Chunking (≤4/group) | FAIL — features 6, region pills 5, FAQ 7, footer 22 links + 5 legal |
| Visual grouping | PASS — hairlines + eyebrows delimit sections cleanly |
| Visual hierarchy | FAIL — LiveTicker renders 44px lime and StatPill 38px lime against a 42px ink H2 (charts.jsx:154,166). A decorative counter out-shouts the section heading. 10 lime CTAs means none reads as *the* action |
| One thing at a time | FAIL — Landing.jsx:334-364 stacks four data displays in one viewport |
| Minimal choices (≤4) | FAIL — pricing section shows 6 buttons; signed-out nav shows 6 controls |
| Working memory | FAIL — credits have no unit anchor; "600 credits" must be carried to /pricing to acquire meaning |
| Progressive disclosure | PARTIAL — the FAQ accordion is the only instance |

## Emotional Journey

**First viewport:** competent, quiet, cold — and showing zero product output. Hero content spans y=109→643; the first generated image is at y=1001.

**Valley 1, the trust bar (299-306):** four unverifiable numbers at 3.77:1. "24/7 · never books a shoot" is a pun where a proof point belongs.

**Peak, the Camila wall (194-219):** the only moment the page proves anything, and it is genuinely strong — but it arrives only after the visitor has already decided to keep scrolling.

**Valley 2, the earnings section:** the `$7,900/second` counter (343) is the page's most manipulative moment, and it is counting *other people's* money. Trust dips exactly where the page is trying to build it. The honest disclaimer that follows (368) is 12.5px at 3.77:1 — legally present, emotionally absent.

**Reassurance at the ask:** the CTA opens a public wizard rather than a signup wall — genuinely good. But "Free credits on sign-up · No card required" appears only in the hero and the footer. It is **absent at both mid-page CTAs and at the final CTA (525-529)**. The moment that most needs reassurance is the one without it.

**Peak-end:** peak is below the fold and unearned by placement; the end is a 384px CTA followed by a 647px footer with 27 links and a four-line hedge about not guaranteeing income. **The last thing the visitor reads is a disclaimer.**

## Persona Red Flags

**Jordan (confused first-timer):** The h1 changes under him — Influencer → Creator → Avatar → Celebrity (Landing.jsx:14). Four nouns for one thing is ambiguity about what the product even is. Three lime buttons compete and are not the same: "Sign up" opens a Clerk modal (Nav.jsx:230), "Create" and "Get started free" go to the public wizard; nothing distinguishes them visually. "200 credits/mo" is meaningless — no image cost appears anywhere on the page. He clicks through the 5-step wizard and discovers the paywall at step 5 (App.jsx:114-117), disclosed on this page only inside a collapsed FAQ answer.

**Riley (stress tester):** Tabs through and sees no focus on any button; concludes the page is unfinished. Enables Reduce Motion — marquee and headline keep going. Middle-clicks "Get started free" for a background tab: nothing, because it's a `<button>` (96), as are all six page CTAs (324, 367, 487, 503, 528). Audits the claims — "3x engagement vs human creators", "$46B market by 2030", "60% of brands open to AI creators" (350-351), "40+ countries creating" (300): no source, no footnote, no link, and the one qualifier is 12.5px at 3.77:1. Unsourced round numbers read as a tell.

**Casey (one-handed, slow connection):** 12,222px of scroll — 15.05 screens at 375px. Primary CTA leaves the viewport at y≈577; the next is at y≈8,405; there is no sticky mobile CTA. The hero's only visual is a dot field that is inert on touch while still burning a rAF loop over ~400 dots per frame. The showcase auto-scrolls and cannot be paused on touch (hover-only, 546); cards aren't interactive at all. Media weight for that decorative strip: **4 mp4s totalling 11.06 MB** plus `/camila/main.jpg` at **1,648 KB** — the only non-WebP in the set — rendered at 212x318. No `poster`, so on a slow link the video cards are flat rectangles as she passes them. The h1 runs 52px with -3px letter-spacing (≈-5.8%) at 375px: the tightest tracking on the page at its smallest size, which is backwards.

## Minor Observations

- The h1's `textContent` is `"Create Your AIInfluencer"` — no space between the two spans (Landing.jsx:80-89). The comment above that block says the merge was done to fix crawler truncation; it half-worked.
- The h1 is **nondeterministic**: whichever of four words is showing when Googlebot snapshots becomes the h1. seoRoutes.js:42 declares "Create your AI influencer" — the rendered h1 matches ~25% of the time.
- All 38 showcase `<img>` share one identical alt string (184), and neither duplicated marquee half is `aria-hidden` (207, 213). A screen reader announces the same sentence 38 times.
- 7/7 FAQ disclosure buttons lack `aria-expanded`, `aria-controls` and `type="button"`.
- `Eyebrow` renders as a `<div>` (marketing.jsx:91-101), so section labels carry no structural meaning for AT.
- FAQ `maxHeight: open ? 320 : 0` (258) is **not** currently clipping — measured, the tallest answer needs 201px at 327px width (119px headroom). It will clip silently when an answer grows.
- The hero comment at 58-60 describes a veil fading out "the photo collage". There is no collage; it was removed.
- "6 AI models" (300) undersells — CLAUDE.md documents 5 MCP plus 6 fal models.
- 36 of 50 desktop / 34 of 48 mobile interactive elements are under 44x44. Worst: legal footer links at 29x14, "Email us" at 67x20, nav "Create" 48x28, "Sign up" 75x28.
- `src/pages/Pricing.jsx` (189 KB) is fetched on the landing route, statically imported via the nav.

## Questions to Consider

1. The strongest asset you own is a wall of one face holding across 25 frames — and you put a canvas of grey dots in front of it. What does this page look like if the first thing a visitor sees is Camila, and the words come second?
2. You argue the market is worth $46B and that creators charge $25,000 a post, then ask for $5.99. If the opportunity is that large, why is the page selling on price rather than on the one capability nobody else has? Whose objection is the earnings section actually answering — the visitor's, or the founder's?
3. There is not one human voice on this page — no creator quote, no real account, no name other than a fictional one. For a product whose premise is manufacturing an audience's trust in a person who doesn't exist, what does it mean that the page cannot produce a single real person willing to say it worked?
