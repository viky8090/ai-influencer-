---
target: /influencers studio
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-06T06-21-51Z
slug: src-pages-influencers-jsx
---
Method: dual-agent (A: ae9f3f4e94e2c4669 · B: aa3abd3633eb883c7)

Target: `/influencers` — src/pages/Influencers.jsx (6,437 lines / 360 KB). Mode: **Operate**.

⚠️ Scope limit: the route is auth-gated (`<Show when="signed-in">`, App.jsx:99). Neither assessment signed in or bypassed auth, so there is NO live browser measurement. Both passes are source-led. Runtime claims are marked as inferred. Computed contrast against real backgrounds, actual focus order, responsive branches and rendered touch targets remain unverified.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Genuinely strong (staged labels, elapsed timer, per-card progress, tab counts) — but the budget contradicts itself: `~8 min` (5356) vs "Up to 5 min" (360) |
| 2 | Match System / Real World | 2 | 1892 tells users to use "the Overview tab"; VIEWS:2613 renamed it Identity. 5346 says "Submitting to Seedance…" for all six models |
| 3 | User Control and Freedom | 2 | Cancel is everywhere, but deleting a wardrobe slot (2004), space (2058) or brand deal (2451) is instant, unconfirmed, irreversible |
| 4 | Consistency and Standards | 1 | Five primary-button treatments and four disabled conventions in one product; the two sibling studios disagree about what a primary button is |
| 5 | Error Prevention | 2 | Over-length script (4739) and over-length audio (5085) both warn and both leave Generate fully enabled |
| 6 | Recognition Rather Than Recall | 3 | VIBE_META and model hints are good; cost is 9.5px at 0.75 opacity and never totalled |
| 7 | Flexibility and Efficiency | 2 | One shortcut (4033) — undiscoverable, global, fires from every view, no Photo equivalent |
| 8 | Aesthetic and Minimalist Design | 2 | Videos at full expansion = 11 numbered sections + history strip + gallery + inspector on one scroll |
| 9 | Error Recovery | 2 | The genError card (5310) is well done; six native `alert()` calls (794, 817, 819, 2456, 2471, 2489) are not |
| 10 | Help and Documentation | 2 | Inline `sub` copy on every step, but "Creator+" (32-33) is never explained and premium models fail server-side with no pre-warning |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Authored, then flattened.**

**LLM assessment:** the domain intelligence is real and lives in the prompt/data layer. `VIDEO_MAX_WORDS` (3088) maps clip duration to a speakable word budget, with a counter that goes amber at 85% and red past it (4736-4750) — nobody ships that without having watched a 15-second clip try to say 40 words. `inferAmbientSound` (2649) regex-matches free-text locations to soundscapes. `annotateDialogue` (2910) injects action beats and gendered pronouns. The reference-images banner (4578-4636) explains which four images become identity anchors — the single most domain-specific piece of UI in the file.

Then the interaction layer throws it away. Eight different kinds of decision — model, vibe, camera, resolution, format, outputs, time-of-day, location — all render as the *same* lime chip (2777, 4876, 4961, 5022, 5225, 5263, 5278, 5293). A category-fluent user cannot distinguish "which model will bill me 200 credits" from "which time of day" at a glance. The Identity view (6327-6397) reverts fully: a three-column CRUD form with nine text fields feeding a percentage ring.

**Deterministic scan:** 9 findings, 2 rules, **8 confirmed / 1 false positive**.
- `layout-transition` x7 (1248, 1859, 2214, 5372, 5474, 6010, 6205) — all confirmed real. The material one is **6010**, animating the full-height sidebar's `width` for 450ms, reflowing the main pane every frame. Four are progress-bar fills; two (1248, 6205) are trivial 1px dividers inside drag handles.
- `bounce-easing` x2 — **3359 confirmed** (`cubic-bezier(0.34,1.56,0.64,1)`, y2 = 1.56, a genuine overshoot on a `scale(1.06)` grid-tile hover). **5341 is a FALSE POSITIVE**: the rule matched the animation *name* `droplet-wobble`, but the declared timing function is `var(--ease-liquid)` = `cubic-bezier(0.25,0.1,0.25,1)` — both control points inside [0,1], zero overshoot, transform-only keyframes.

The detector found 9 things. The static pass found the ones that matter, and they are invisible to any rule: **0 `aria-label`, 0 `role`, 0 `tabIndex`, 0 `aria-live`, 0 `htmlFor`, 0 `aria-pressed`, 0 `aria-selected` across 6,437 lines and 127 buttons** (independently re-verified).

## Overall Impression

This is the most *engineered* surface in the product and the least *designed*. The generation durability is genuinely sophisticated — `genEpochRef` invalidates stale loops, `savedOnGenerated` is captured before the await so switching influencers mid-render can't cross-contaminate, partial results persist synchronously, and a page reload resumes in-flight jobs. That is careful, expensive work that users of generative tools have been trained not to expect.

None of it is visible. Meanwhile the number the user actually needs — what this click costs — is 9.5px at 0.75 opacity and structurally incomplete, and the button that spends the money renders white text on lime at **1.29:1**.

Biggest opportunity: **make the primary action legible, then make the price honest.**

## What's Working

1. **The flat 8-tab nav with mounted-but-hidden studios** (2593-2614, 6261-6264). Library first — the work you made is the page, not a tab six deep. Keeping both generators mounted behind `display:none` rather than unmounting means a view switch cannot silently kill a running job, and the code says so. Tab counts turn the nav into a free status readout.
2. **Generation durability** (3845, 4466, 4078, and `resumeVideoJob`). Not losing work is felt as trust even though it is invisible.
3. **Progressive disclosure that holds** (4851-4864). The Advanced toggle reduces first-run from eleven sections to three and persists via `cs_advanced_open`. Paired with the portalled reference-images popup (4831-4847), which correctly escapes every `overflow` ancestor with edge-collision math at 4796-4799.
4. **The wait state.** Staged label, elapsed timer against budget, cancel, per-card progress, skeletons in the history strip, live count in the button label, partial results streaming in, auto-scroll to the card. This is the best-designed moment in the product.

## Priority Issues

### [P0] The primary CTA is white text on lime — 1.29:1
- **Verified independently.** Influencers.jsx:5579 sets `color: canAct ? '#fff' : …` over `background: 'var(--brand)'` (#C7F24E). Computed contrast **1.29:1** against a 4.5:1 requirement. `'#fff'` appears 52 times in this file; 34 sites pair it with a `var(--brand)` background.
- **Why it matters:** this is the button the entire surface exists to serve. The label `✦ Generate Video` and its live `2/3 ready · 1:42` status are effectively unreadable. It is simultaneously a consistency fault: PhotoStudio.jsx:1562 uses `var(--brand-ink)` on the identical background, and `glassBtnPrimary` (glass.js:34) already pairs brand with brand-ink correctly. The right answer exists in the codebase and this file ignores it.
- **Fix:** replace `'#fff'` with `var(--brand-ink)` at every site over a brand background, then route both generate buttons through `glassBtnPrimary` and pick one radius (999 or 12, not both).
- **Suggested command:** `/impeccable harden`

### [P0] The library grid — the default landing view — is unreachable by keyboard
- `HistoryCard`'s root (3350) is a `<div>` with `onClick`, no `tabIndex`, no `role`, no `onKeyDown` (verified). Library is where the studio opens (5848). Compounding it, the multi-select toggle (3405) renders only when `hovered || showSelect || isSelected`, and `showSelect` is `selected.size > 0` — the only entry into selection mode is a hover-revealed control, which is a closed loop on touch.
- Worse: hover action bars (469-511, 686, 732, 3757) use `opacity: hovered ? 1 : 0` and leave buttons in the DOM. **The destructive Delete at 469 is focusable and activatable while invisible.**
- **Fix:** make the card root a `<button>` (or `role="button" tabIndex={0}` + Enter/Space). Add a persistent Select toggle to the toolbar at 3569. Replace `opacity: 0` with `visibility: hidden` so hidden controls leave the tab order.
- **Suggested command:** `/impeccable harden`

### [P1] ⌘↵ fires a paid generation from every view
- 4031-4040 registers a `window` keydown handler calling `generate()`, **with no dependency array**, so it is removed and re-added on every render. `ContentStudio` is never unmounted — it is hidden behind `display:none` (6264). *Inferred from code:* the listener stays live in Library, Photos, Wardrobe, Spaces, Deals, Scripts and Identity. Pressing ⌘↵ in the Photos studio — where the muscle memory is to submit *that* form — starts a video render and spends credits with no visible UI.
- **Fix:** gate on `view === 'videos'`, add a dependency array, and give PhotoStudio the equivalent shortcut so the two studios behave the same.

### [P1] Total credit cost is never shown at the point of commitment
- Unit cost sits on the model chip at 9.5px / 0.75 opacity (5235). The multipliers — outputs 1-3 (5292), duration 4-15s (5248), resolution up to 1080p (5277) — live in a different sub-block. The button reads `✦ Generate 3 Videos` with no number. The comment at 23-24 concedes the chip is "a hint only" and the server price book is authoritative: **the UI knowingly displays a number it knows to be incomplete.**
- **Why it matters:** worst case is 3 x Seedance 2 at 1080p/15s against a chip reading `~200 cr`. Users of credit-metered tools budget obsessively; hiding the multiplication is the fastest way to lose them.
- **Fix:** compute the estimate client-side from the same inputs the worker uses and put it in the button — `✦ Generate 3 Videos · ~600 cr`. If `estimate > balance`, swap to `Not enough credits · Top up`.

### [P1] Screen-reader users cannot operate this surface at all
- Not "with difficulty". **0 `role`, 0 `aria-label`, 0 `aria-live`, 0 `aria-pressed`, 0 `aria-selected`, 0 `tabIndex`, 0 `htmlFor`** across 41 form controls and 127 buttons (verified). Concretely: the 8-tab nav (6227) has no `role="tablist"`/`aria-selected`, so the current view is signalled by colour and a 2px underline only. Every chip group is a row of plain buttons with no `aria-pressed` or `role="radiogroup"` — selection is carried entirely by a lime tint. The generation progress region (5327-5378) has **no `role="status"`/`aria-live"`**, so the one moment where feedback matters most is silent.
- **Fix:** tablist semantics on the view nav; `role="radiogroup"` + `aria-checked` on the eight chip groups; `aria-live="polite"` on the progress region; `htmlFor`/`aria-label` on all 41 controls.

### [P2] Five primary-button treatments, four disabled conventions, 16 unmanaged z-index values
- Primaries: 5577 (radius 12, `#fff`), PhotoStudio 1559 (radius 999, brand-ink, `liquid-press`), NewModal 2574 (radius 999, 0.45s), SaveScriptModal 1029 (`glassBtnPrimary`), confirmVidClear 5824 (solid #FF3B30). Disabled: background swap (5578), opacity 0.5 (2418), label-only (487), nothing at all (4650). One `not-allowed` cursor across 14 disabled sites. Z-index runs 99999 / 10000 / 9999 / 9998 / 9000 / 2000 / 999 / 500 / 400 / 300 / 200 with no scale.
- Operate's rule: if save looks different in two places, one is wrong. Here four are.

### [P2] Five modals with no Escape, no focus trap, no dialog semantics
- `NewModal` (2562), `NewBrandModal` (2275), `ImportBrandDealsModal` (2358), delete-confirm (5815), fullscreen video (5766). None register a keydown listener; none set `role="dialog"`/`aria-modal`; none trap or restore focus. **0 `.focus()` calls in the entire file.** `MediaLightbox` (3198) and `CtxMenu` (200) show the pattern the others are missing. Separately `del()` at 5972 uses a raw `window.confirm` while the visually identical video delete gets a styled modal.

## Cognitive Load

**5 of 8 fail.** FAIL: single focus (Videos = 11 sections + strip + gallery + inspector); chunking (8 peer views, 5 sibling settings controls); one-thing-at-a-time (Advanced reveals 9 sections at once); minimal choices; working memory (cost on one chip, multipliers in another block — the user does the arithmetic). PASS: visual grouping, visual hierarchy (marginal), progressive disclosure.

**Eight decision points over budget:** view nav 8 · video model 6 · location 8+N+free text · vibe 8 · voice 7/6 · duration 12 stops · wardrobe 1+N · brand-deal strip unbounded.

## Persona Red Flags

**Alex (impatient power user):** lands on Library, tabs, nothing focuses — reaches for the mouse on the very first interaction. Opens Advanced and nine sections unfold at once, numbered 3-11 (a scheme that only parses if you already opened the drawer). Wants a saved rig: `VIDEO_TEMPLATES` (2690) and `applyTemplate` (4441) **exist in the file and are never rendered** — the feature he wants is written and unwired. Uses 🎲 Random (5566) instead, which wipes his settings with no undo. Regenerates slot 2; slot 3's button is `disabled` but **styled identically to enabled** (5445-5447), so he clicks a dead control twice. Switching influencers force-resets him to Library every time (5920).

**Sam (screen reader + keyboard):** cannot complete the task. The tab state, the chip state, the progress announcement and the output grid are all unavailable. Can tab to and fire an invisible Delete (469). Sidebar reordering is pointer-only (6087). One thing works: the global `:focus-visible` ring in index.css — which this session restored.

## Minor Observations

- Stale instruction: 1892 says "generate one in the Overview tab first"; that tab is now Identity.
- 5346 hardcodes "Submitting to Seedance…" for all six models.
- **28 `transition:'all'`** declarations and 20 transitions at 450-500ms, against Operate's 150-250ms budget.
- `--ease-liquid` and `--ease-jelly` are **defined identically** (index.css:33-34) — two token names, one curve.
- **39% of colour values bypass the token layer**: 425 raw literals (125 hex / 27 distinct, 300 rgba / 94 distinct) vs 676 `var(--)` references. `199,242,78` is re-declared as a raw triplet at 9+ alpha values while `var(--brand)` exists in the same file.
- **698 `style={{` vs 26 `className`** — effectively 100% inline.
- **148 `useState`, 46 `useRef`, 43 `useEffect`, 1 `useMemo`, 0 `useCallback`.** `ContentStudio` alone holds 54 `useState` and 16 nested function declarations recreated every render.
- 17 `<img>`, 4 with no `alt` (2810, 4585, 4690, 4842), **0 with `loading=`**.
- Only **1 skeleton** in 6,437 lines (5705). 3 empty-state strings.
- 18 interactive elements under 44px; three range inputs are **3-5px tall** (1557, 3261, 5249).
- Clipping candidate: the reference-images tooltip (4607) is `position:absolute` and **not** portalled while its `<main>` ancestor (6213) is `overflow:auto`.
- ~200 lines of dead code: `HeroBanner` (234-346, zero call sites), `VIDEO_TEMPLATES`, `DIALOGUE_STARTERS`, two unused imports.
- Three near-identical image-slot components (378, 582, 770) — ~545 lines wanting one abstraction.
- `regenerateSlot` (4513) hardcodes `isCancelled: () => false` — slot regeneration cannot be cancelled.
- Built chunk is **338 KB uncompressed, the largest in the app** — 4.9x the next-largest page chunk.

## Questions to Consider

1. If the Advanced drawer is closed by default and the surface still works — what are those nine sections for? `canAct` is satisfied by dialogue alone. Either the 60+ chips are load-bearing for output quality, in which case burying them is wrong, or they are ceremony. The numbering (1, 2, then 3-11 conditionally) suggests the file hasn't decided.
2. The most sophisticated thing here is invisible — is that the right trade? What if one line said "your renders survive a refresh" and one line said "this will cost ~600 of your 1,240 credits"?
3. Why are there two studios? Photos and Videos have separate files, separate primary buttons (one legible, one not), separate keyboard behaviour, separate history stores reconciled by hand at 3486-3516. The Library already merges them behind a segmented control. If the user's model is "make a thing of my influencer," the split is an implementation detail that leaked into the IA — and it costs a full duplicate of every state, shortcut and button treatment.
