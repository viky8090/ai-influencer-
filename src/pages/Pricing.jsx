import { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import {
  Card,
  Badge,
  Button,
  Text,
  SegmentedControl,
  SegmentedControlItem,
  ClickableCard,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { api } from '../api/client'
import { glassCard, glassBtnPrimary, glassBtnGhost, glassModal, glassOverlay } from '../ui/glass'
import AstryxScope from '../ui/ax/AstryxScope'
import { useSEO, SITE_URL } from '../ui/seo'

// Pricing v2 — reference-style plan cards with per-plan CREDIT TIER sliders.
// Each slider step is a real Polar product (worker/src/lib/polarCatalog.js) selected at
// checkout via the `credits` param; annual products grant 12× the monthly tier.
// Estimates derive from the live price book: image (Flash) 6 VC, video clip (Lite 5s) 25 VC.

const IMG_VC = 6   // pb_v1_img_flash
const VID_VC = 25  // pb_v1_video_lite (5s)
const KLING_VC = 50 // pb_v1_video_kling25 — used by the plan finder for cinematic picks

// tiers: [{ c: monthly credits, m: $/month }] — annual = 10× monthly (2 months free).
const PLANS = [
  {
    name: 'Starter', key: 'starter', featured: null,
    blurb: 'For trying your first AI influencer.',
    tiers: [{ c: 200, m: 5.99 }],
    fixedNote: 'Fixed amount of 200 credits/mo',
    feats: [
      ['1 influencer', 1],
      ['Photo Studio — all standard models', 1],
      ['Video Studio — Lite, Pro, Kling, Sora', 1],
      ['Social publish & schedule', 1],
      ['AI Assist (backstory, script, caption)', 1],
      ['Seedance 2.0 & Veo 3 Fast', 0],
      ['Commercial license', 0],
      ['Lowest cost per credit', 0],
    ],
    access: { premium: false, res: '2K' },
  },
  {
    name: 'Creator', key: 'creator', featured: 'popular',
    blurb: 'For consistent, easy AI content creation.',
    tiers: [{ c: 600, m: 31.99 }, { c: 900, m: 45.99 }],
    feats: [
      ['5 influencers', 1],
      ['All image models', 1, { chip: 'GPT · NANO PRO', color: 'brand' }],
      ['All video models', 1, { chip: 'PREMIUM', color: 'brand' }],
      ['2K images · 1080p video', 1, { chip: '2K', color: 'blue' }],
      ['Social publish & schedule', 1],
      ['Commercial license', 1],
      ['Email support', 1],
      ['Lowest cost per credit', 0],
    ],
    access: { premium: true, res: '2K' },
  },
  {
    name: 'Pro', key: 'pro', featured: null,
    blurb: 'For agencies and high-volume creators.',
    tiers: [{ c: 1800, m: 74.99 }, { c: 2700, m: 106.99 }, { c: 3600, m: 135.99 }],
    feats: [
      ['25 influencers', 1],
      ['All models + premium video', 1, { chip: 'PREMIUM', color: 'brand' }],
      ['4K images + upscale path', 1, { chip: '4K', color: 'blue' }],
      ['High priority queue', 1],
      ['Social publish & schedule', 1],
      ['Commercial license', 1],
      ['1-month credit rollover', 1],
      ['Priority email support', 1],
    ],
    access: { premium: true, res: '4K' },
  },
  {
    name: 'Studio', key: 'studio', featured: 'best',
    blurb: 'For teams shipping many personas.',
    tiers: [{ c: 5500, m: 191.99 }, { c: 8000, m: 266.99 }, { c: 11000, m: 352.99 }],
    feats: [
      ['Unlimited influencers', 1],
      ['All models + premium video', 1, { chip: 'PREMIUM', color: 'brand' }],
      ['4K · highest priority', 1, { chip: '4K', color: 'blue' }],
      ['Social publish & schedule', 1],
      ['Commercial license', 1],
      ['2-month credit rollover', 1],
      ['Priority onboarding', 1],
      ['Lowest cost per credit', 1, { chip: '40% CHEAPER', color: 'brand' }],
    ],
    access: { premium: true, res: '4K' },
  },
]

const PACKS = [
  { key: 'small', c: '500', p: '$21.99', e: '$0.044 / credit' },
  { key: 'medium', c: '1,500', p: '$59.99', e: '$0.040 / credit' },
  { key: 'large', c: '5,000', p: '$171.99', e: '$0.034 / credit' },
  { key: 'mega', c: '15,000', p: '$481.99', e: '$0.032 / credit' },
]

const MATRIX = [
  {
    group: 'Create & identity',
    rows: [
      ['Influencers', '1', '5', '25', 'Unlimited'],
      ['Create wizard', '✓', '✓', '✓', '✓'],
      ['Character sheet / close-ups', '✓', '✓', '✓', '✓'],
      ['Wardrobe & home slots', '✓', '✓', '✓', '✓'],
      ['Brand deal sheets', '✓', '✓', '✓', '✓'],
    ],
  },
  {
    group: 'Photo Studio',
    rows: [
      ['Locations, poses, outfits, props', '✓', '✓', '✓', '✓'],
      ['Max resolution', '1K–2K', '2K', '4K', '4K'],
      ['Standard models (Flash, Soul, Seedream, Krea)', '✓', '✓', '✓', '✓'],
      ['GPT Image 2 / Nano Banana Pro', '✓', '✓', '✓', '✓'],
    ],
  },
  {
    group: 'Video Studio',
    rows: [
      ['Seedance Lite / Pro, Kling, Sora', '✓', '✓', '✓', '✓'],
      ['Seedance 2.0 & Veo 3 Fast', '—', '✓', '✓', '✓'],
      ['Talking head / product / GRWM templates', '✓', '✓', '✓', '✓'],
      ['Start-frame image-to-video', '✓', '✓', '✓', '✓'],
    ],
  },
  {
    group: 'Credits & rights',
    rows: [
      ['Monthly credits', '200', '600 – 900', '1,800 – 3,600', '5,500 – 11,000'],
      ['Top-up packs', '✓', '✓', '✓', '✓'],
      ['Commercial license', 'Personal only', '✓', '✓', '✓'],
      ['Credit rollover', '—', '—', '1 month', '2 months'],
      ['Queue priority', 'Standard', 'Standard', 'High', 'Highest'],
      ['Support', 'Community', 'Email', 'Priority email', 'Priority + onboarding'],
    ],
  },
]

const COLS = ['Starter', 'Creator', 'Pro', 'Studio']

const fmt = (n) => n.toLocaleString('en-US')
const estImages = (c) => Math.round(c / IMG_VC)
const estClips = (c) => Math.round(c / VID_VC)

function Check({ dim }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, color: dim ? 'var(--text-tertiary)' : 'var(--brand)' }}><path d="M20 6 9 17l-5-5" /></svg>
}
function Cross() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-tertiary)', opacity: 0.7 }}><path d="M18 6 6 18M6 6l12 12" /></svg>
}
function Spark() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M12 2l2.1 6.2L20 10l-5.9 1.8L12 18l-2.1-6.2L4 10l5.9-1.8z" /></svg>
}
function Coin() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10h5" /></svg>
}

const CHIP_VARIANT = { brand: 'success', blue: 'blue', pink: 'pink' }

function MiniChip({ text, color = 'brand' }) {
  return <Badge label={text} variant={CHIP_VARIANT[color] || 'neutral'} />
}

// ── Animated credit-tier slider ──────────────────────────────────────────────
// The thumb tracks the pointer 1:1 while dragging (a fine-grained hidden range input),
// then SPRING-SNAPS to the nearest purchasable tier on release. Ruler ticks light up in
// a wave as the fill passes them; the thumb carries ‹ › arrows like the reference.
const SLIDER_RES = 200 // hidden input granularity — smooth drag even with 2–3 tiers

function TierSlider({ tiers, index, onChange, accent = 'var(--brand)' }) {
  const [drag, setDrag] = useState(null) // continuous 0..1 while dragging, null when idle
  const snapPos = tiers.length > 1 ? index / (tiers.length - 1) : 1
  const pos = drag ?? snapPos
  const dragging = drag !== null
  const TICKS = 25

  const settle = () => setDrag(null) // release → spring back onto the selected tier

  const onInput = (e) => {
    const p = Number(e.target.value) / SLIDER_RES
    setDrag(p)
    const ni = Math.round(p * (tiers.length - 1))
    if (ni !== index) onChange(ni) // live credits/price update mid-drag
  }

  // Arrow keys step whole tiers, not 1/200ths.
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(index + 1, tiers.length - 1)); setDrag(null) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(index - 1, 0)); setDrag(null) }
  }

  const spring = 'left 0.38s cubic-bezier(0.34, 1.4, 0.4, 1)'
  const springW = 'width 0.38s cubic-bezier(0.34, 1.4, 0.4, 1)'

  return (
    <div style={{ margin: '10px 0 2px' }}>
      <div style={{ position: 'relative', height: 26 }}>
        {/* Track + ruler ticks + fill */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)' }} />
          <div style={{
            position: 'absolute', top: 11, left: 0, height: 4, borderRadius: 2,
            width: `${pos * 100}%`, background: accent,
            boxShadow: `0 0 10px ${accent === 'var(--brand)' ? 'rgba(199,242,78,0.45)' : 'rgba(255,61,139,0.45)'}`,
            transition: dragging ? 'none' : springW, // 1:1 under the pointer, spring on release
          }} />
          {Array.from({ length: TICKS }).map((_, i) => {
            const t = i / (TICKS - 1)
            const passed = t <= pos + 0.001
            return (
              <span key={i} style={{
                position: 'absolute', top: i % 4 === 0 ? 6 : 9, left: `${t * 100}%`, width: 2,
                height: i % 4 === 0 ? 14 : 8, borderRadius: 1, transform: 'translateX(-1px)',
                background: passed ? accent : 'var(--border)', opacity: passed ? 0.9 : 0.55,
                transition: dragging ? 'background 0.1s, opacity 0.1s' : `background 0.2s ease ${i * 14}ms, opacity 0.2s ease ${i * 14}ms`,
              }} />
            )
          })}
          {/* Thumb */}
          <div style={{
            position: 'absolute', top: 3, left: `${pos * 100}%`, width: 20, height: 20,
            transform: `translateX(-10px) scale(${dragging ? 1.18 : 1})`,
            borderRadius: 6, background: 'var(--surface)', border: `2px solid ${accent}`,
            boxShadow: dragging
              ? `0 0 0 6px ${accent === 'var(--brand)' ? 'rgba(199,242,78,0.18)' : 'rgba(255,61,139,0.18)'}, var(--shadow-sm)`
              : 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            transition: dragging
              ? 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)'
              : `${spring}, transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)`,
          }}>
            <svg width="10" height="8" viewBox="0 0 14 10" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><path d="M5 1 2 5l3 4M9 1l3 4-3 4" /></svg>
          </div>
        </div>
        <input
          type="range" min={0} max={SLIDER_RES} step={1}
          value={Math.round(pos * SLIDER_RES)}
          onChange={onInput}
          onKeyDown={onKey}
          onPointerUp={settle}
          onPointerCancel={settle}
          onBlur={settle}
          aria-label="Monthly credits"
          aria-valuetext={`${fmt(tiers[index].c)} credits per month`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
      {/* Tier stop labels */}
      <div style={{ position: 'relative', height: 16, marginTop: 2 }}>
        {tiers.map((t, i) => {
          const p = tiers.length > 1 ? i / (tiers.length - 1) : 1
          const on = i === index
          return (
            <button key={t.c} onClick={() => onChange(i)} style={{
              position: 'absolute', top: 0, left: `${p * 100}%`,
              transform: i === 0 ? 'none' : i === tiers.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', fontSize: 10.5, fontWeight: on ? 800 : 600,
              color: on ? 'var(--text-primary)' : 'var(--text-tertiary)', transition: 'color 0.2s',
            }}>
              <Coin />{fmt(t.c)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ pl, annual, busy, onChoose }) {
  const [ti, setTi] = useState(0)
  const tier = pl.tiers[ti]
  const isBest = pl.featured === 'best'
  const isPopular = pl.featured === 'popular'
  const accent = isBest ? 'var(--accent-2)' : 'var(--brand)'

  // Starter's entry plan gets NO annual discount (annual = flat 12×); paid tiers get 17% off.
  const discounted = pl.key !== 'starter'
  const monthlyEq = annual && discounted ? Math.round(((tier.m * 10) / 12) * 100) / 100 : tier.m
  const savings = discounted ? tier.m * 2 : 0

  const tint = isPopular
    ? 'linear-gradient(180deg, rgba(199,242,78,0.09), rgba(199,242,78,0.015) 55%)'
    : isBest
      ? 'linear-gradient(180deg, rgba(255,61,139,0.09), rgba(255,61,139,0.015) 55%)'
      : 'none'

  return (
    <Card
      padding={4}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        backgroundImage: tint,
        overflow: 'visible',
        ...(isPopular ? { border: '1px solid rgba(199,242,78,0.5)' } : {}),
        ...(isBest ? { border: '1px solid rgba(255,61,139,0.45)' } : {}),
      }}
    >
      {/* Featured pill — floats on the top border so the name row never wraps */}
      {(isPopular || isBest) && (
        <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', zIndex: 1, whiteSpace: 'nowrap' }}>
          {isPopular ? <MiniChip text="MOST POPULAR" color="brand" /> : <Badge label="⭐ BEST VALUE" variant="blue" />}
        </span>
      )}

      {/* Name + badges */}
      <HStack gap={2} align="center" style={{ flexWrap: 'wrap' }}>
        {/* Plain h3 wrapper rather than Astryx <Heading>: per CLAUDE.md the Heading
            component renders at a different scale than Text and would visibly shrink this.
            `font: inherit` keeps the rendered result byte-identical while giving the plan
            name real structure — a screen-reader user browsing this page by heading was
            getting the title and "Compare plans in detail" and nothing else. */}
        <h2 style={{ font: 'inherit', margin: 0, display: 'contents' }}>
          <Text type="body" weight="bold" size="lg" style={{ letterSpacing: '0.4px', textTransform: 'uppercase' }}>{pl.name}</Text>
        </h2>
        {annual && pl.key !== 'starter' && <MiniChip text="17% OFF" color="pink" />}
      </HStack>
      <Text type="supporting" size="xsm" color="secondary" display="block" style={{ margin: '5px 0 12px', lineHeight: 1.4 }}>{pl.blurb}</Text>

      {/* Credits box */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 12px 8px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
          <span style={{ color: accent, display: 'flex' }}><Spark /></span>
          <span key={tier.c} className="vy-num-in" style={{ fontSize: 15.5, fontWeight: 900, letterSpacing: '-0.2px' }}>{fmt(tier.c)} credits/mo.</span>
        </div>
        <div key={`e${tier.c}`} className="vy-num-in" style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '5px 0 0 20px', lineHeight: 1.5 }}>
          = {fmt(estImages(tier.c))} images (Flash)<br />≈ {fmt(estClips(tier.c))} video clips (Lite 5s)
        </div>
        {pl.tiers.length > 1 ? (
          <TierSlider tiers={pl.tiers} index={ti} onChange={setTi} accent={accent} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0 2px', minHeight: 44, padding: '7px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Check dim />{pl.fixedNote}
          </div>
        )}
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, minHeight: 34 }}>
        {annual && discounted && (
          <span key={`s${tier.m}`} className="vy-num-in" style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-2)', textDecoration: 'line-through', textDecorationThickness: 2 }}>${tier.m}</span>
        )}
        <span key={`p${monthlyEq}${annual}`} className="vy-num-in" style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px' }}>${monthlyEq}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{annual ? 'per month, billed annually' : 'billed monthly'}</span>
      </div>

      {/* CTA */}
      <Button
        label={busy === pl.key ? 'Redirecting…' : `Get ${pl.name}`}
        variant={isBest || isPopular ? 'primary' : 'secondary'}
        size="md"
        isLoading={busy === pl.key}
        isDisabled={busy === pl.key}
        onClick={() => onChoose(pl.key, annual ? 'year' : 'month', tier.c)}
        style={{
          width: '100%', marginTop: 8, fontWeight: 800,
          ...(isBest
            ? { background: 'var(--accent-2)', color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 18px rgba(255,61,139,0.35)' }
            : isPopular
              ? { boxShadow: '0 4px 18px rgba(199,242,78,0.3)' }
              : {}),
        }}
      />
      <Text
        type="supporting"
        size="xsm"
        weight="bold"
        color={annual && discounted ? 'accent' : 'secondary'}
        justify="center"
        display="block"
        style={{ marginTop: 6, minHeight: 14 }}
      >
        {annual && discounted ? `Save $${fmt(savings)} compared to monthly` : annual ? 'No difference compared to monthly' : ' '}
      </Text>

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '13px 0 0', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {pl.feats.map(([label, yes, extra]) => (
          <li key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.8, color: yes ? 'var(--text-secondary)' : 'var(--text-tertiary)', lineHeight: 1.35 }}>
            {yes ? <Check /> : <Cross />}
            <span style={{ flex: 1, textDecoration: yes ? 'none' : 'none', opacity: yes ? 1 : 0.75 }}>{label}</span>
            {yes && extra?.chip ? <MiniChip text={extra.chip} color={extra.color} /> : null}
          </li>
        ))}
      </ul>

      {/* Model access */}
      <div style={{ marginTop: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '11px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-tertiary)', marginBottom: 8 }}>◍ PREMIUM VIDEO</div>
        {[
          ['Seedance 2.0', pl.access.premium],
          ['Veo 3 Fast', pl.access.premium],
          ['Kling 2.5 · Sora 2', true],
          ['Seedance Lite / Pro', true],
        ].map(([m, ok]) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 11.5, color: ok ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{ok ? <Check /> : <Cross />}{m}</span>
            {ok
              ? <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'var(--brand)', color: 'var(--brand-ink)' }}>Full access</span>
              : <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>No access</span>}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 11.5, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', marginTop: 5, paddingTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check />Image models</span>
          <MiniChip text={pl.access.res} color="blue" />
        </div>
      </div>
    </Card>
  )
}

// ── Plan finder ("Not sure which plan?") ─────────────────────────────────────
const GOALS = [
  { key: 'social', label: 'Social media videos', icon: '🎬' },
  { key: 'avatar', label: 'Talking-avatar videos', icon: '👤' },
  { key: 'ugc', label: 'UGC & product video ads', icon: '💰' },
  { key: 'photos', label: 'Marketing product photos', icon: '📷' },
  { key: 'cinematic', label: 'Cinematic videos', icon: '🎥' },
  { key: 'personal', label: 'Personal use', icon: '✨' },
]

// Deterministic pseudo-histogram bars for the finder sliders (reference look).
const BARS = Array.from({ length: 36 }, (_, i) => 6 + Math.abs(Math.sin(i * 2.7)) * 14)

function VolumeSlider({ label, unit, max, step, value, onChange, vcEach }) {
  const pos = value / max
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 24, marginBottom: 4 }}>
        {BARS.map((h, i) => {
          const on = i / (BARS.length - 1) <= pos
          return <span key={i} style={{ flex: 1, height: h, borderRadius: 1, background: on ? 'var(--brand)' : 'var(--border)', opacity: on ? 0.85 : 0.5, transition: `background 0.18s ease ${i * 8}ms` }} />
        })}
      </div>
      <input
        type="range" min={0} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          width: '100%', appearance: 'none', WebkitAppearance: 'none', height: 5, borderRadius: 3, outline: 'none',
          cursor: 'pointer', background: `linear-gradient(to right, var(--brand) ${pos * 100}%, var(--bg-tertiary) ${pos * 100}%)`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {value === max ? `${fmt(max)}+ ` : `${fmt(value)} `}{unit}
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}> · {fmt(value * vcEach)} credits</span>
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
    </div>
  )
}

function recommend({ goals, videos, images }) {
  const cinematic = goals.has('cinematic') || goals.has('avatar')
  const vidVc = cinematic ? KLING_VC : VID_VC
  const needVc = Math.max(videos * vidVc + images * IMG_VC, 50)
  const needsPremium = cinematic || goals.has('ugc')

  for (const pl of PLANS) {
    if (needsPremium && !pl.access.premium) continue
    for (let i = 0; i < pl.tiers.length; i++) {
      if (pl.tiers[i].c >= needVc) return { plan: pl, ti: i, needVc, overflow: false }
    }
  }
  const studio = PLANS[3]
  return { plan: studio, ti: studio.tiers.length - 1, needVc, overflow: true }
}

function PlanFinder({ onClose, onChoose, busy }) {
  const [goals, setGoals] = useState(() => new Set(['social']))
  const [videos, setVideos] = useState(12)
  const [images, setImages] = useState(60)
  const [annual, setAnnual] = useState(true)

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const rec = useMemo(() => recommend({ goals, videos, images }), [goals, videos, images])
  const tier = rec.plan.tiers[rec.ti]
  const usagePct = Math.min(100, Math.round((rec.needVc / tier.c) * 100))
  // Starter carries no annual discount (flat 12× monthly) — see polarCatalog.js.
  const recDiscounted = rec.plan.key !== 'starter'
  const monthlyEq = annual && recDiscounted ? Math.round(((tier.m * 10) / 12) * 100) / 100 : tier.m
  const isBest = rec.plan.featured === 'best'
  const accent = isBest ? 'var(--accent-2)' : 'var(--brand)'

  const featChips = [
    ...(images > 0 ? ['AI image generation'] : []),
    ...(videos > 0 ? ['AI video generation'] : []),
    'Social publishing',
    ...(goals.has('cinematic') || goals.has('avatar') ? ['Premium video models'] : []),
  ]

  const toggleGoal = (k) => setGoals((s) => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k); else n.add(k)
    return n
  })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, ...glassOverlay, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '5vh 16px 40px' }}>
      <div onClick={(e) => e.stopPropagation()} className="reveal" style={{ ...glassModal, width: '100%', maxWidth: 960, padding: '26px 26px 22px', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>✕</button>
        <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.6px', margin: 0 }}>Find the best plan for you</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '5px 0 20px' }}>Choose what you want to create and get what you need</p>

        <div className="vy-finder-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 24 }}>
          {/* Left — questions */}
          <div>
            {/* 1 · goals */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>What are you here to make?</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>Multiple options can be selected</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {GOALS.map((g) => {
                    const on = goals.has(g.key)
                    return (
                      <button key={g.key} onClick={() => toggleGoal(g.key)} className="liquid-press" style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 'var(--radius-sm)',
                        border: on ? '1px solid rgba(199,242,78,0.55)' : '1px solid var(--border)',
                        background: on ? 'rgba(199,242,78,0.08)' : 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}>
                        <span>{g.icon}</span><span style={{ flex: 1 }}>{g.label}</span>
                        <span style={{
                          width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                          border: on ? 'none' : '1.5px solid var(--border)',
                          background: on ? 'var(--brand)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--brand-ink)" strokeWidth="4" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 2 · volume */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>How many content items per month?</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12, lineHeight: 1.5 }}>
                  ≈ {goals.has('cinematic') || goals.has('avatar') ? KLING_VC : VID_VC} credits each · per video clip{goals.has('cinematic') || goals.has('avatar') ? ' (Kling 2.5)' : ' (Lite 5s)'}<br />
                  = {IMG_VC} credits each · per image (Flash)
                </div>
                <VolumeSlider label="# video clips" unit="videos" max={60} step={1} value={videos} onChange={setVideos} vcEach={goals.has('cinematic') || goals.has('avatar') ? KLING_VC : VID_VC} />
                <VolumeSlider label="# images" unit="images" max={600} step={10} value={images} onChange={setImages} vcEach={IMG_VC} />
              </div>
            </div>

            {/* 3 · features */}
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Features & capabilities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {featChips.map((f) => (
                    <span key={f} style={{ fontSize: 11.5, fontWeight: 700, padding: '6px 11px', borderRadius: 999, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — recommendation */}
          <div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: 10 }}>
              We recommend the <span style={{ color: accent }}>{rec.plan.name}</span> plan
            </div>
            <div key={`${rec.plan.key}${rec.ti}`} className="vy-num-in" style={{
              ...glassCard, padding: '18px 16px',
              backgroundImage: isBest
                ? 'linear-gradient(180deg, rgba(255,61,139,0.09), rgba(255,61,139,0.015) 55%)'
                : 'linear-gradient(180deg, rgba(199,242,78,0.09), rgba(199,242,78,0.015) 55%)',
              border: isBest ? '1px solid rgba(255,61,139,0.45)' : '1px solid rgba(199,242,78,0.5)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{rec.plan.name}</span>
                {annual && rec.plan.key !== 'starter' && <MiniChip text="17% OFF" color="pink" />}
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: accent, display: 'flex' }}><Spark /></span>
                  <span style={{ fontSize: 14.5, fontWeight: 900 }}>{fmt(tier.c)} credits/mo</span>
                </div>
                <div style={{ margin: '10px 0 4px', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Expected monthly usage</span>
                  <span style={{ color: usagePct > 92 ? 'var(--accent-2)' : 'var(--brand)' }}>{fmt(rec.needVc)}/{fmt(tier.c)} credits</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${usagePct}%`, borderRadius: 3, background: usagePct > 92 ? 'var(--accent-2)' : 'var(--brand)', transition: 'width 0.4s cubic-bezier(0.34, 1.2, 0.4, 1), background 0.3s' }} />
                </div>
                {rec.overflow && <div style={{ fontSize: 10.5, color: 'var(--accent-2)', fontWeight: 700, marginTop: 6 }}>Heavy volume — add top-up packs as needed.</div>}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rec.plan.feats.filter(([, yes]) => yes).slice(0, 3).map(([label]) => (
                  <li key={label} style={{ display: 'flex', gap: 7, fontSize: 11.5, color: 'var(--text-secondary)' }}><Check />{label}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {annual && rec.plan.key !== 'starter' && <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-2)', textDecoration: 'line-through' }}>${tier.m}</span>}
                <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.8px' }}>${monthlyEq}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 600 }}>/month{annual ? ', billed annually' : ''}</span>
              </div>
              <button onClick={() => onChoose(rec.plan.key, annual ? 'year' : 'month', tier.c)} disabled={busy === rec.plan.key} className="liquid-press" style={{
                width: '100%', fontSize: 13.5, fontWeight: 800, padding: 11, marginTop: 10, cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                opacity: busy === rec.plan.key ? 0.6 : 1,
                ...(isBest
                  ? { background: 'var(--accent-2)', color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 18px rgba(255,61,139,0.35)' }
                  : { ...glassBtnPrimary, boxShadow: '0 4px 18px rgba(199,242,78,0.3)' }),
              }}>{busy === rec.plan.key ? 'Redirecting…' : `Get ${rec.plan.name}`}</button>
              {annual && rec.plan.key !== 'starter' && (
                <div style={{ fontSize: 10.5, textAlign: 'center', color: 'var(--brand)', fontWeight: 700, marginTop: 6 }}>Save ${fmt(tier.m * 2)} compared to monthly</div>
              )}
            </div>

            {/* interval toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <IntervalToggle annual={annual} setAnnual={setAnnual} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Monthly/Annual control ───────────────────────────────────────────────────
function IntervalToggle({ annual, setAnnual, compact: _compact }) {
  return (
    <HStack gap={2} align="center">
      <SegmentedControl
        label="Billing interval"
        value={annual ? 'year' : 'month'}
        onChange={(v) => setAnnual(v === 'year')}
        size="md"
      >
        <SegmentedControlItem value="month" label="Monthly" />
        <SegmentedControlItem value="year" label="Annual" />
      </SegmentedControl>
      <Badge label="17% OFF" variant="pink" />
    </HStack>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Pricing() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const clerk = useClerk()
  const [annual, setAnnual] = useState(true)
  const [busy, setBusy] = useState(false)
  const [finderOpen, setFinderOpen] = useState(false)

  // Plan prices are published as schema.org Offers so Google can show a price range in the
  // SERP. Prices come straight from PLANS, so they can't go stale relative to the page.
  useSEO({
    path: '/pricing',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Vymotion',
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'AI influencer studio',
      operatingSystem: 'Web',
      url: `${SITE_URL}/pricing`,
      offers: [
        {
          '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD',
          description: 'Explore the studio — no card required.',
          url: `${SITE_URL}/pricing`, availability: 'https://schema.org/InStock',
        },
        ...PLANS.map((pl) => ({
          '@type': 'Offer',
          name: `${pl.name} plan`,
          description: pl.blurb,
          price: pl.tiers[0].m.toFixed(2),
          priceCurrency: 'USD',
          url: `${SITE_URL}/pricing`,
          availability: 'https://schema.org/InStock',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: pl.tiers[0].m.toFixed(2),
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitText: 'MONTH',
          },
        })),
      ],
    },
  })

  const choose = async (key, interval, credits) => {
    if (!isSignedIn) return clerk.openSignUp?.()
    if (!key) return navigate('/dashboard')
    if (busy) return
    setBusy(key)
    try {
      const { url } = await api.billing.checkout(key, interval, credits)
      window.location.assign(url)
    } catch (e) {
      console.warn('checkout unavailable:', e)
      setBusy(false)
      alert('Checkout isn’t available right now — please try again in a moment.')
    }
  }

  return (
    <AstryxScope>
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="reveal" style={{ textAlign: 'center', padding: '44px 20px 8px' }}>
        {/* Semantic <h1> wrapper around the display Text: the page had no h1 at all, and
            Astryx's <Heading type="display-2"> renders a different (smaller) scale than
            <Text type="display-2">, so wrapping keeps the visual identical. `font: inherit`
            stops the UA h1 defaults leaking in. */}
        <h1 style={{ font: 'inherit', margin: 0 }}>
          <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-0.8px' }}>
            AI influencer pricing that matches how you ship
          </Text>
        </h1>
        <Text type="body" color="secondary" display="block" style={{ margin: '10px auto 0', maxWidth: 560, lineHeight: 1.55 }}>
          Pick a plan, slide to the credit volume you need. Higher tiers unlock premium video, commercial rights and a lower cost per credit.
          Failed generations are never charged.
        </Text>
      </div>

      {/* Controls row — finder + interval */}
      <div className="reveal-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', margin: '22px 24px 4px' }}>
        <Button
          label="Not sure which plan?"
          variant="secondary"
          size="md"
          onClick={() => setFinderOpen(true)}
          endContent={<Badge label="NEW" variant="success" />}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
            </svg>
          }
          style={{ borderRadius: 999 }}
        />
        <IntervalToggle annual={annual} setAnnual={setAnnual} />
      </div>

      {/* Plan cards */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="price-plans reveal-2">
          {PLANS.map((pl) => (
            <PlanCard key={pl.name} pl={pl} annual={annual} busy={busy} onChoose={choose} />
          ))}
        </div>
      </div>

      {/* Publish / Postiz callout */}
      <div style={{ maxWidth: 900, margin: '28px auto 0', padding: '0 24px' }} className="reveal-3">
        <Card padding={5}>
          <Text type="supporting" size="xsm" weight="bold" color="accent" style={{ textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }} display="block">
            Social publish
          </Text>
          <Text type="large" weight="bold" display="block" style={{ letterSpacing: '-0.4px', marginBottom: 8 }}>
            Schedule posts without leaving Vymotion
          </Text>
          <Text type="body" size="sm" color="secondary" display="block" style={{ lineHeight: 1.6 }}>
            Every plan includes social publishing — connect accounts and schedule from the Publish calendar.
            Media comes from your generation library. Scheduling runs through our publishing layer (Postiz) — you never manage API keys.
            Instagram, TikTok, and YouTube unlock as platform approvals complete; X, LinkedIn, Facebook, Pinterest and others are available as configured.
          </Text>
        </Card>
      </div>

      {/* Comparison matrix */}
      <div style={{ maxWidth: 1240, margin: '40px auto 0', padding: '0 24px 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', margin: '0 0 16px', textAlign: 'center' }}>Compare plans in detail</h2>
        <div style={{ ...glassCard, overflow: 'auto' }} className="price-matrix">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, zIndex: 1 }}>Feature</th>
                {COLS.map((c) => (
                  <th key={c} style={{ textAlign: 'center', padding: '12px 10px', fontWeight: 800, color: c === 'Creator' ? 'var(--brand)' : c === 'Studio' ? 'var(--accent-2)' : 'var(--text-primary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((section) => (
                <Fragment key={section.group}>
                  <tr>
                    <td colSpan={5} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--brand)', background: 'var(--accent-light)', borderBottom: '1px solid var(--border)' }}>
                      {section.group}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i} style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-subtle)',
                          color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: i === 0 ? 600 : 500,
                          textAlign: i === 0 ? 'left' : 'center',
                          background: i === 0 ? 'var(--surface)' : 'transparent',
                          position: i === 0 ? 'sticky' : undefined,
                          left: i === 0 ? 0 : undefined,
                          fontSize: i === 0 ? 12.5 : 12,
                          lineHeight: 1.4,
                          maxWidth: i === 0 ? 220 : 140,
                        }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '10px 0 0', textAlign: 'center' }}>
          Starter is personal-use only. Commercial license starts on Creator. Premium video (Seedance 2, Veo 3 Fast) requires Creator or higher.
        </p>
      </div>

      {/* Packs */}
      <div style={{ textAlign: 'center', margin: '42px 0 4px' }}>
        <h2 style={{ font: 'inherit', margin: 0 }}><Text type="large" weight="bold" display="block" style={{ letterSpacing: '-0.4px' }}>Need more? Top up anytime</Text></h2>
        <Text type="body" size="sm" color="secondary" display="block" style={{ marginTop: 7 }}>
          One-off credit packs — available on any plan. Top-up credits last 12 months.
        </Text>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 1240, margin: '16px auto 0', padding: '0 24px 40px' }} className="price-packs">
        {PACKS.map((p) => (
          <ClickableCard
            key={p.c}
            label={`${p.c} credits for ${p.p}`}
            onClick={() => choose(p.key)}
            isDisabled={busy === p.key}
            padding={4}
            style={{ textAlign: 'center', opacity: busy === p.key ? 0.6 : 1 }}
          >
            <VStack gap={1} align="center">
              <Text type="display-3" weight="bold" style={{ letterSpacing: '-0.5px' }}>{p.c}</Text>
              <Text type="body" size="sm" weight="bold">{p.p}</Text>
              <Text type="supporting" size="xsm" color="secondary">{p.e}</Text>
            </VStack>
          </ClickableCard>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '10px 24px 70px' }}>
        <h2 style={{ font: 'inherit', margin: 0, marginBottom: 14 }}><Text type="large" weight="bold" display="block">FAQ</Text></h2>
        {[
          ['How do credit tiers work?', 'Creator, Pro and Studio come in multiple credit sizes — use the slider on each card to pick your monthly volume. Bigger tiers cost less per credit. You can change tier or plan any time from the billing portal.'],
          ['What is social publish?', 'Connect your social accounts once and schedule posts from Vymotion’s Publish calendar. Media comes from your generation library — no platform API keys for you to manage.'],
          ['Can I use Starter commercially?', 'No. Starter is personal use only. Creator, Pro, and Studio include a commercial license for generated assets (subject to our likeness policy).'],
          ['Failed generations?', 'Never charged. Credits held for a job are released if generation fails, times out, is canceled, or is filtered.'],
        ].map(([q, a]) => (
          <Card key={q} padding={3} style={{ marginBottom: 10 }}>
            <Text type="body" weight="bold" display="block" style={{ marginBottom: 6 }}>{q}</Text>
            <Text type="body" size="sm" color="secondary" display="block" style={{ lineHeight: 1.55 }}>{a}</Text>
          </Card>
        ))}
      </div>

      {finderOpen && <PlanFinder onClose={() => setFinderOpen(false)} onChoose={choose} busy={busy} />}

      <style>{`
        @keyframes vy-num-in {
          from { opacity: 0; transform: translateY(7px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .vy-num-in { animation: vy-num-in 0.32s var(--ease-out) both; display: inline-block; }
        @media (max-width: 1080px) { .price-plans { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 760px) { .price-packs { grid-template-columns: repeat(2, 1fr) !important; } .vy-finder-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .price-plans { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
    </AstryxScope>
  )
}
