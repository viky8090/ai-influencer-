---
target: /create wizard
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-06T11-02-00Z
slug: src-pages-create-jsx
---
⚠️ DEGRADED: single-context (session usage limit terminated both assessment sub-agents; re-spawning would likely hit the same wall)

Target: `/create` — src/pages/Create.jsx (1,800 lines). Mode: **Operate / onboarding**. Public route; live walkthrough completed end to end at 1280x900.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | StepRail with ✓ marks and a "Now" pip is genuinely good; undercut by a fabricated progress curve during generation |
| 2 | Match System / Real World | 3 | Plain language throughout; "Both optional — the more you give, the closer the result" is exactly right |
| 3 | User Control and Freedom | 2 | Back preserves state, but a refresh wiped everything and the browser Back button exits the wizard entirely |
| 4 | Consistency and Standards | 3 | Internally consistent; chip vocabulary is uniform across steps |
| 5 | Error Prevention | 2 | Continue is disabled with no statement of what is missing, and keeps `cursor: pointer` — it invites a click that does nothing |
| 6 | Recognition Rather Than Recall | 3 | Everything is visible; nothing must be remembered between steps |
| 7 | Flexibility and Efficiency | 2 | Steps 2 and 3 are fully optional but still presented as sequential gates; no skip-ahead; 🎲 Randomize is the one accelerator |
| 8 | Aesthetic and Minimalist Design | 2 | Step 4 renders **62 option buttons** in one view |
| 9 | Error Recovery | 1 | Refresh at step 3 = total loss, silently. Save failure is a native `alert()` |
| 10 | Help and Documentation | 2 | Good inline hints and an AI assist for backstory; zero help on cost |
| **Total** | | **23/40** | **Acceptable** |

## Design Specificity Verdict

**Authored — and the voice is the most product-specific thing in the codebase.**

`LOADING_MESSAGES` (744) is a long set of lines written in a real voice: *"making them objectively better looking than you. nothing personal."* · *"they will not lie awake at 2am about a caption they posted in 2022."* No competitor has this, no template generates it, and it turns the one unavoidable dead moment — a 60-180s wait — into the most memorable part of the flow. It is also the only place in the product where Vymotion sounds like a person.

The structure underneath is a conventional 5-step wizard, but the content is not interchangeable: `PhysicalBuilder` (529) with ethnicity/skin/hair/eye/build is specific to constructing a persona, and the reference-image slots with per-slot notes are specific to identity anchoring.

Worth flagging: the SEO manifest describes this flow as "pick a look, personality and niche" (seoRoutes.js:89) while the actual steps are Basics → References → Story → Look → Generate. The copy and the product have drifted apart.

**Deterministic scan:** 4 findings, all in motion.
- `bounce-easing` x3: **1125 and 1189 confirmed** (`cubic-bezier(0.34, 1.42, 0.64, 1)` and `(0.34, 1.32, 0.64, 1)` — y2 > 1, real overshoot). **1468 is a FALSE POSITIVE** — same `droplet-wobble` name-match seen in the studio; the actual easing is `var(--ease-liquid)`, zero overshoot.
- `layout-transition` x1 at 1038 (`transition: width`) — confirmed, a progress bar fill.

## Overall Impression

The best-written surface in the product, sitting on the most fragile state management. A first-timer is asked for a name, gender, age, 13 niches, two uploads, a backstory, a personality slider, 62 appearance choices and a model — and until this pass, **a single accidental refresh threw all of it away and returned them to a blank step 1 with no explanation.**

## What's Working

1. **The loading copy.** Genuinely funny, genuinely on-brand, and deployed at exactly the right moment.
2. **The StepRail** (213). Completed steps get ✓, current gets a "Now" pip, and the state survives Back navigation — verified live: returning to step 1 from step 5 still showed "Nova Reyes" / "27" / Fashion selected.
3. **Optional steps are labelled optional.** "Both optional — the more you give, the closer the result" tells the user the cost/benefit instead of demanding input.
4. **Progressive gender-aware options** — `HAIR_LENGTHS_FEMALE` / `_MALE`, `BUILDS_FEMALE` / `_MALE`, and vibe filtering on gender change (1610). Small, and most wizards don't bother.

## Priority Issues

### [P0] A refresh destroyed the entire wizard — FIXED
Verified before: filled step 1, advanced to step 3, reloaded → **back to step 1, every field empty**, no warning. Nothing was persisted, in an app that is otherwise local-first and persists ~90 values in the studio alone. This is the activation flow: the user has spent maximum effort and has zero investment tempting them to retype it.
**Fixed** — draft now saves to `create_wizard_draft` on every change and restores step + answers on load, with a "Picked up where you left off" banner and an explicit Start over. Reference images are deliberately excluded (data URLs would blow the localStorage budget). Draft clears on successful creation.

### [P0] The paywall was never mentioned until the user hit it — FIXED
Walked all five steps live. Step 5 offered six generation engines and a "Generate 3 looks →" button with **no mention of credits, cost, sign-in or an account anywhere in the flow**. The boundary is enforced in App.jsx:114; the landing page advertises "Free credits on sign-up · No card required"; the wizard itself said nothing. A first-timer learns the rules by colliding with them, after maximum invested effort.
**Fixed** — a line under the CTA now states it before the click, branching on auth: signed-out gets "You'll sign in first — it's free, no card required, and your answers are kept"; signed-in gets the credits framing plus the refund-on-failure promise.

### [P1] Step 4 presents 62 options in a single view
Measured live: 62 option buttons on "How do they look?" — ethnicity (8), skin tone, hair colour, hair length, hair texture, eye colour, build, plus free text. Working memory tops out around 4. `🎲 Randomize` exists and is the right instinct, but it is a bypass, not a structure.
**Fix:** collapse to two visible decisions (ethnicity + build) with the rest behind a "Refine appearance" disclosure, mirroring the Advanced pattern the studio already uses. Not applied — it is a layout redesign of a 160-line component and belongs in its own pass.

### [P1] Disabled Continue explains nothing and lies about being clickable
Measured: with the form empty, Continue is `disabled` but computes `cursor: pointer`, full lime at `opacity: 0.5`. Clicking produces no message and no focus move. There is a `shakeContinue` state (1603) but nothing names the missing field.
**Fix:** `cursor: not-allowed`, plus a line naming what is required. Not applied — it interacts with the existing shake affordance and deserves one considered treatment rather than a bolt-on.

### [P2] The generation progress bar is fabricated, and runs backwards
`FAKE_WAYPOINTS` (914) is a hardcoded `[elapsed_ms, percent]` curve with no connection to job state. It is also **non-monotonic by design**: 27→24, 51→49, 69→65, 80→78. A progress bar that visibly retreats is a well-known trust-destroyer, and this one retreats four times during a wait the copy itself admits can reach 3.5 minutes. The organic feel is not worth it — and the real signal exists, since `estLabel`/`MODEL_EST_MS` (922) already models per-model duration.
**Fix:** keep the eased fake curve if real progress is unavailable, but make it monotonic.

### [P2] No `h1`, and the browser Back button exits the flow
Measured: **zero `h1` elements** on `/create`; the page's top heading is an `h2` ("Name your influencer") while seoRoutes.js:90 declares an h1. Separately, `history.length` stayed at 2 across all five steps — steps are internal state only, so browser Back leaves the wizard entirely. The draft fix now makes that recoverable rather than fatal, but the step should be in the URL.

### [P3] A11y baseline matches the studio's
0 `aria-label`, 0 `role`, 0 `tabIndex`, 0 `htmlFor`, 0 `<label>`, 0 `onKeyDown` in 1,800 lines. Field captions are rendered by `Lbl` (144) as plain text with no `htmlFor`, so nothing is programmatically associated with its input. 23 of 27 interactive elements are under 44x44 (most are shared nav; in-page, the 13 niche chips are 34px tall). Accessible names: 0 missing — every control resolves a name from its text.

## Cognitive Load

**4 of 8 fail.** FAIL: chunking (13 niches on step 1, 62 options on step 4); minimal choices (steps 1, 4 and 5 all exceed 4); one-thing-at-a-time (step 4 stacks seven attribute groups); progressive disclosure (only Randomize, no staged reveal). PASS: single focus (one step per screen is the right frame), grouping, hierarchy, working memory (nothing must be carried between steps).

## Persona Red Flags

**Jordan (confused first-timer):** clicks Continue on the empty form; it is disabled, shows a pointer cursor, and says nothing about what is missing. Reaches step 4 and meets 62 choices with no default and no explanation of which matter for output quality. Reaches step 5, picks between six engines labelled only by vendor and vibe ("✦ BEST", "zero 'AI look'") with **no cost or quality axis to choose on**. Until this pass, learned about the account requirement by clicking the final button.

**Casey (distracted, one-handed, slow connection):** the persona this flow was actively hostile to. A phone backgrounding the tab, an incoming call, or a mistaken swipe wiped five steps of work with no recovery and no warning — the single highest-value fix on this surface, now shipped.

## Minor Observations

- 24 `useState`, 6 `useEffect`, 175 inline `style={{}}` vs 16 `className`.
- One `alert()` (1746) for the save failure — the only error surface in the flow.
- `FloatingCards` (160) renders 16 decorative images from `ALL_IMGS`; worth checking their weight against the landing page's media findings.
- Step 5's model cards carry no price signal at all, while the studio shows per-model credit costs. Same models, two different disclosure standards.
- The measured "contrast failure" on the nav credit chip (`— cr`, ratio 1.00) is a **measurement artifact** — the walker resolved a translucent lime background rather than the opaque ancestor. Not a real failure. The `— cr` itself indicates the credits API 401ing in dev.

## Questions to Consider

1. The funniest, most human writing in the product is on a screen the user sees once, for 90 seconds, while waiting. What would it cost to let that voice into the rest of the app — and what does it mean that the studio, where users spend all their time, has none of it?
2. Steps 2 and 3 are both optional. Why are they steps? A wizard that can be completed by answering step 1 and skipping to Generate is really a 3-step wizard with two offers in the middle.
3. You ask for 62 appearance decisions before showing a single generated image. What if the flow inverted — generate three looks from the basics alone, then let the user refine what they can already see?
