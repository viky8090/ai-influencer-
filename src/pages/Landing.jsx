import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { glassBtnPrimary, pressHandlers } from '../ui/glass'
import { M, Section, Eyebrow, H2, Lead, CTA, Reveal, mCard } from '../ui/marketing'
import { GrowthChart, TierBars, LiveTicker, StatPill } from '../ui/charts'
import { useSEO, SITE_URL } from '../ui/seo'
import Footer from '../components/Footer'
import {
  MARKET_GROWTH, TIER_EARNINGS, CREATOR_SPEND_PER_SEC, FAQ,
} from '../ui/marketData'

const WORDS = ['Influencer', 'Creator', 'Avatar', 'Celebrity']
const MORPH_CYCLE_MS = 2600
const MORPH_OUT_MS = 550

function useWordMorph() {
  const [wordIdx, setWordIdx] = useState(0)
  const [out, setOut] = useState(false)
  useEffect(() => {
    const cycle = setInterval(() => {
      setOut(true)
      setTimeout(() => { setWordIdx((i) => (i + 1) % WORDS.length); setOut(false) }, MORPH_OUT_MS)
    }, MORPH_CYCLE_MS)
    return () => clearInterval(cycle)
  }, [])
  return { word: WORDS[wordIdx], out }
}

const ALL_IMGS = [
  '/inf/i1.png', '/inf/i2.png', '/inf/i3.jpg', '/inf/i4.jpg', '/inf/i5.png',
  '/inf/i6.jpg', '/inf/i7.png', '/inf/i8.png', '/inf/i9.png', '/inf/i10.png',
  '/inf/i11.png', '/inf/i12.png', '/inf/i13.png', '/inf/i14.png', '/inf/i15.png',
  '/inf/i16.png', '/inf/i17.png', '/inf/i18.png', '/inf/i19.png', '/inf/i20.png',
  '/inf/i21.png', '/inf/i22.png', '/inf/i23.png', '/inf/i24.png', '/inf/i25.png',
  '/inf/i26.png', '/inf/i27.png', '/inf/i28.png', '/inf/i29.png',
  '/inf/i30.png', '/inf/i31.png', '/inf/i32.png', '/inf/i33.png', '/inf/i34.png',
  '/inf/i35.png', '/inf/i36.png', '/inf/i37.png', '/inf/i38.png', '/inf/i39.png',
  '/inf/i40.png', '/inf/i41.png', '/inf/i42.png', '/inf/i43.png', '/inf/i44.png',
  '/inf/i45.png', '/inf/i46.png',
]

// React doesn't reflect the `muted` prop as a DOM attribute, which can make browsers
// veto `autoPlay` on mount — force-mute and kick playback from a ref instead. Chrome also
// pauses video-only media while a tab is hidden, so resume when the page becomes visible.
const autoplayRef = (el) => {
  if (!el) return
  el.muted = true
  const kick = () => { const p = el.play(); if (p) p.catch(() => {}) }
  kick()
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && el.isConnected && el.paused) kick()
  })
}

const CARDS = [
  { left: '-28px', top: '6%', w: 158, rot: '-9deg', opacity: 0.52, depth: 0.9 },
  { left: '28px', top: '43%', w: 138, rot: '5deg', opacity: 0.40, depth: 0.45 },
  { left: '-14px', top: '74%', w: 146, rot: '-5deg', opacity: 0.44, depth: 0.65 },
  // The most prominent card plays a real generated video loop instead of rotating stills
  // (v2 is the smallest clip — keeps the above-the-fold payload sane).
  { right: '-28px', top: '4%', w: 160, rot: '10deg', opacity: 0.58, depth: 1.0, video: '/camila/videos/v2.mp4' },
  { right: '24px', top: '42%', w: 140, rot: '-7deg', opacity: 0.40, depth: 0.4 },
  { right: '-16px', top: '72%', w: 148, rot: '6deg', opacity: 0.46, depth: 0.7 },
]

// ── Hero (the signature dark hero, preserved) ────────────────────────────────
function Hero() {
  const navigate = useNavigate()
  const { word, out } = useWordMorph()
  const press = pressHandlers(0.95)
  const [cardSrcs, setCardSrcs] = useState(() => ALL_IMGS.slice(0, CARDS.length))
  const [cardFade, setCardFade] = useState(() => CARDS.map(() => false))
  const cardRefs = useRef([])

  useEffect(() => {
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0
    function onMove(e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
      if (!raf) raf = requestAnimationFrame(step)
    }
    function step() {
      raf = 0
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06
      CARDS.forEach((card, i) => {
        const el = cardRefs.current[i]
        if (!el) return
        const drift = 10 + card.depth * 22
        el.style.transform = `rotate(${card.rot}) translate(${(-cx * drift).toFixed(1)}px, ${(-cy * drift).toFixed(1)}px)`
      })
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(step)
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    let alive = true
    // Only image cards rotate — video cards keep their loop playing.
    const imgIdxs = CARDS.map((c, i) => (c.video ? null : i)).filter((i) => i !== null)
    function tick() {
      if (!alive) return
      const i = imgIdxs[Math.floor(Math.random() * imgIdxs.length)]
      setCardFade((prev) => { const n = [...prev]; n[i] = true; return n })
      setTimeout(() => {
        if (!alive) return
        setCardSrcs((prev) => {
          const options = ALL_IMGS.filter((s) => s !== prev[i])
          const next = [...prev]; next[i] = options[Math.floor(Math.random() * options.length)]; return next
        })
        setCardFade((prev) => { const n = [...prev]; n[i] = false; return n })
      }, 750)
    }
    const id = setInterval(tick, 2800)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <section style={{
      minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: M.bg,
      padding: 'calc(var(--nav-h) + 40px) 24px 80px', textAlign: 'center',
    }}>
      {CARDS.map((card, i) => {
        const pos = {}
        if (card.left !== undefined) pos.left = card.left
        if (card.right !== undefined) pos.right = card.right
        return (
          <div key={i} className="landing-card reveal" style={{ position: 'absolute', top: card.top, ...pos, width: card.w, opacity: card.opacity, animationDelay: `${0.1 + i * 0.05}s`, pointerEvents: 'none', zIndex: 0 }}>
            <div ref={(el) => { cardRefs.current[i] = el }} style={{ transform: `rotate(${card.rot})`, willChange: 'transform' }}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.55)', opacity: cardFade[i] ? 0 : 1, transition: 'opacity 0.5s var(--ease-out)' }}>
                {card.video
                  ? <video ref={autoplayRef} src={card.video} muted autoPlay loop playsInline style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                  : <img src={cardSrcs[i]} alt="" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,11,0.5) 0%, transparent 55%)' }} />
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(10,10,11,0.88) 100%)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ maxWidth: 720, position: 'relative', zIndex: 2 }}>
        <div className="reveal-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: M.card, color: M.sub, padding: '6px 14px 6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, letterSpacing: '0.3px', marginBottom: 36, border: `1px solid ${M.line}` }}>
          <span style={{ width: 7, height: 7, background: 'var(--brand)', borderRadius: 2, flexShrink: 0 }} />
          The AI influencer studio
        </div>

        <h1 className="reveal-2" style={{ fontSize: 'clamp(52px,9vw,92px)', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.0, color: '#fff', marginBottom: 2 }}>
          Create Your
        </h1>
        <div className="reveal-3" style={{ fontSize: 'clamp(52px,9vw,92px)', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.1, minHeight: '1.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <span style={{ color: 'var(--brand)', display: 'inline-block', opacity: out ? 0 : 1, transform: out ? 'translateY(6px)' : 'translateY(0)', transition: `opacity ${MORPH_OUT_MS}ms var(--ease-out), transform ${MORPH_OUT_MS}ms var(--ease-out)` }}>
            {word}
          </span>
        </div>

        <p className="reveal-4" style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 auto 44px', maxWidth: 540, fontWeight: 400, letterSpacing: '-0.1px' }}>
          Design a hyper-realistic AI influencer, generate on-brand photos and video, and turn the audience into income — no camera, no crew.
        </p>

        <div className="reveal-5" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/create')} {...press}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; press.onMouseLeave(e) }}
            style={{ ...glassBtnPrimary, padding: '14px 32px', fontSize: 16, letterSpacing: '-0.2px', borderRadius: 10 }}>
            Get started free →
          </button>
          <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '14px 28px', fontSize: 16, fontWeight: 700, borderRadius: 10, cursor: 'pointer', background: M.card, color: '#fff', border: `1px solid ${M.line}` }}>
            See how it works
          </button>
        </div>

        <div className="reveal-6" style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap', marginTop: 34, fontSize: 13, color: 'rgba(255,255,255,0.42)' }}>
          {['Free credits on sign-up', 'No card required', 'Ready in 5 minutes'].map((t) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>{t}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .landing-card { display: block; }
        @media (max-width: 860px) { .landing-card { display: none; } }
      `}</style>
    </section>
  )
}

// ── "Made with Vymotion" showcase — real seed-influencer photos + video loops ─
// Two rows that scroll in opposite directions so the whole roster is always in motion.
// Camila carries the most assets on purpose — it shows the same face holding across dozens
// of shots (the hard part of AI characters, and the thing worth showing off).
const ROW_A = [
  { src: '/camila/main.jpg', name: 'Camila', tag: 'Signature look' },
  { src: '/camila/videos/v1.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
  { src: '/kayla/main.jpg', name: 'Kayla', tag: 'Signature look' },
  { src: '/inf/i10.png', name: 'Nina', tag: 'Editorial' },
  { src: '/camila/photos/p2.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/marcus/video1.mp4', video: true, name: 'Marcus', tag: 'Video Studio' },
  { src: '/marcus/main.png', name: 'Marcus', tag: 'Signature look' },
  { src: '/inf/i1.png', name: 'Sofia', tag: 'Street style' },
  { src: '/camila/videos/v3.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
  { src: '/jake/main.jpeg', name: 'Jake', tag: 'Signature look' },
  { src: '/camila/photos/p4.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/inf/i20.png', name: 'Aria', tag: 'Golden hour' },
  { src: '/camila/videos/v4.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
]
const ROW_B = [
  { src: '/camila/photos/p6.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/camila/videos/v2.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
  { src: '/brad/brand_deals/deal1.jpeg', name: 'Brad', tag: 'Brand deal' },
  { src: '/inf/i7.png', name: 'Elena', tag: 'Signature look' },
  { src: '/camila/photos/p8.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/marcus/video1.mp4', video: true, name: 'Marcus', tag: 'Video Studio' },
  { src: '/inf/i33.png', name: 'Maya', tag: 'Editorial' },
  { src: '/camila/photos/p10.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/camila/videos/v1.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
  { src: '/inf/i25.png', name: 'Chloe', tag: 'Street style' },
  { src: '/camila/photos/p12.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/camila/photos/p13.png', name: 'Camila', tag: 'Photo Studio' },
  { src: '/camila/videos/v3.mp4', video: true, name: 'Camila', tag: 'Video Studio' },
]

// Videos only start downloading once the strip is near the viewport — the clips are
// multi-MB each and this section sits below the fold.
function LazyVideo({ src, style }) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={ref} src={on ? src : undefined} muted autoPlay loop playsInline preload="none"
      onLoadedData={(e) => autoplayRef(e.currentTarget)}
      style={style}
    />
  )
}

function ShowcaseCard({ m }) {
  const media = { width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', background: '#0D0D14' }
  return (
    <div style={{ position: 'relative', width: 214, flexShrink: 0, marginRight: 16, borderRadius: 18, overflow: 'hidden', border: `1px solid ${M.line}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 44px rgba(0,0,0,0.5)' }}>
      {m.video
        ? <LazyVideo src={m.src} style={media} />
        : <img src={m.src} alt={`${m.name} — AI influencer made with Vymotion`} loading="lazy" style={media} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,7,14,0.72) 0%, transparent 42%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{m.name}</div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{m.tag}</div>
      </div>
    </div>
  )
}

function ShowcaseSection() {
  return (
    <section style={{ padding: '92px 0', overflow: 'hidden', position: 'relative' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
        <Reveal><Eyebrow>Made with Vymotion</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>Real personas, straight out of the studio</H2></Reveal>
        <Reveal delay={0.1}><Lead>Every still and every looping clip below was generated here — the same face, wardrobe, and vibe across every shot. Hover to pause.</Lead></Reveal>
      </div>
      <Reveal delay={0.12} style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="vy-marquee-mask">
          <div className="vy-marquee">
            {[...ROW_A, ...ROW_A].map((m, i) => <ShowcaseCard key={i} m={m} />)}
          </div>
        </div>
        {/* second row drifts the opposite way (left → right) for a livelier wall */}
        <div className="vy-marquee-mask">
          <div className="vy-marquee reverse">
            {[...ROW_B, ...ROW_B].map((m, i) => <ShowcaseCard key={i} m={m} />)}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

// ── Small reusable pieces ────────────────────────────────────────────────────
function StepCard({ n, title, body, icon }) {
  return (
    <Reveal delay={n * 0.05} style={{ ...mCard, padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(199,242,78,0.12)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: M.faint, letterSpacing: '1px' }}>STEP {n}</span>
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 800, color: M.ink, margin: '0 0 8px', letterSpacing: '-0.4px' }}>{title}</h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: M.sub, margin: 0 }}>{body}</p>
    </Reveal>
  )
}

function FeatureCard({ title, body, icon }) {
  return (
    <Reveal style={{ ...mCard, padding: 24 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <h3 style={{ fontSize: 16.5, fontWeight: 800, color: M.ink, margin: '0 0 7px', letterSpacing: '-0.3px' }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: M.sub, margin: 0 }}>{body}</p>
    </Reveal>
  )
}

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: `1px solid ${M.lineSoft}` }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 4px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 16.5, fontWeight: 700, color: M.ink }}>{q}</span>
        <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, border: `1px solid ${M.line}`, color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s var(--ease-liquid)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </button>
      <div style={{ maxHeight: open ? 320 : 0, overflow: 'hidden', transition: 'max-height 0.4s var(--ease-liquid)' }}>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: M.sub, margin: '0 4px 22px' }}>{a}</p>
      </div>
    </div>
  )
}

// ── Landing page ─────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [faqOpen, setFaqOpen] = useState(0)

  useSEO({
    title: 'Create AI Influencers That Earn',
    description: 'Vymotion is the all-in-one studio to create, grow, and monetize hyper-realistic AI influencers. Generate on-brand photos and video, land brand deals, and sell creator services across the US and Europe.',
    path: '/',
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'Vymotion', url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Vymotion', url: SITE_URL },
      {
        '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Vymotion',
        applicationCategory: 'MultimediaApplication', operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  })

  return (
    <div style={{ background: M.bg, color: M.ink }}>
      <Hero />

      {/* Operational trust bar */}
      <div style={{ borderTop: `1px solid ${M.line}`, borderBottom: `1px solid ${M.line}`, background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }} className="trust-bar">
          {[['5 min', 'to your first post'], ['6 AI models', 'best-in-class engines'], ['40+', 'countries creating'], ['24/7', 'never books a shoot']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: M.ink }}>{v}</div>
              <div style={{ fontSize: 12.5, color: M.faint, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Made with Vymotion — real influencer stills + video loops */}
      <ShowcaseSection />

      {/* How it works */}
      <Section id="how" tint style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>From idea to income in four steps</H2></Reveal>
        <Reveal delay={0.1}><Lead>No filming, no studio, no editing suite. Vymotion runs the whole pipeline — you direct.</Lead></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 40 }} className="grid-4">
          <StepCard n={1} title="Design the persona" body="Pick a look, personality, and niche. Vymotion builds a consistent identity that stays the same face across every shot." icon={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />
          <StepCard n={2} title="Generate content" body="Photos, outfits, poses, and video clips on demand — studio quality, on brand, in minutes." icon={<><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /></>} />
          <StepCard n={3} title="Grow the audience" body="Post consistently across Instagram, TikTok, YouTube, and X. Plan a content calendar that never runs dry." icon={<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>} />
          <StepCard n={4} title="Monetize" body="Land brand deals, sell UGC and shoutouts, and offer creator services to businesses in the US and Europe." icon={<><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>} />
        </div>
        <Reveal delay={0.1} style={{ marginTop: 34 }}>
          <CTA kind="ghost" onClick={() => navigate('/how-it-works')}>Read the full walkthrough →</CTA>
        </Reveal>
      </Section>

      {/* Earnings / the money story */}
      <Section id="earnings" style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow color={M.pink}>The opportunity</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>The AI influencer economy is exploding</H2></Reveal>
        <Reveal delay={0.1}><Lead>Virtual creators post 24/7, never age, and command engagement that rivals — often beats — human influencers. The market behind them is growing fast.</Lead></Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, marginTop: 40 }} className="grid-2">
          <Reveal style={{ ...mCard, padding: '26px 26px 20px' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: M.ink, marginBottom: 4 }}>Virtual influencer market size</div>
            <div style={{ fontSize: 12.5, color: M.faint, marginBottom: 14 }}>Global, USD billions — estimate</div>
            <GrowthChart data={MARKET_GROWTH} valueFormat={(v) => `$${v}B`} />
          </Reveal>

          <Reveal delay={0.06} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...mCard, padding: 24 }}>
              <LiveTicker base={0} ratePerSec={CREATOR_SPEND_PER_SEC} label="Creator-economy spend since you arrived (est.)" />
              <p style={{ fontSize: 12.5, color: M.faint, margin: '10px 0 0', lineHeight: 1.5 }}>
                The global creator economy is on track for ~$480B by 2027. That’s roughly ${CREATOR_SPEND_PER_SEC.toLocaleString()} flowing to creators every second.
              </p>
            </div>
            <div style={{ ...mCard, padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <StatPill value="3×" label="engagement vs human creators" />
              <StatPill value="$46B" label="market by 2030" />
              <StatPill value="60%" label="of brands open to AI creators" />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.05} style={{ ...mCard, padding: 26, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: M.ink }}>What creators charge, by audience size</div>
              <div style={{ fontSize: 12.5, color: M.faint, marginTop: 3 }}>Typical rate per sponsored post — industry estimate</div>
            </div>
          </div>
          <TierBars data={TIER_EARNINGS} />
        </Reveal>

        <Reveal delay={0.08} style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <CTA onClick={() => navigate('/earnings')}>See how creators monetize →</CTA>
          <span style={{ fontSize: 12.5, color: M.faint, maxWidth: 420 }}>Estimates for illustration only — not a guarantee of income.</span>
        </Reveal>
      </Section>

      {/* Features */}
      <Section style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow>Everything in one studio</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>One tool for the whole workflow</H2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }} className="grid-3">
          <FeatureCard title="Consistent identity" body="The same face, body, and vibe across thousands of images — the hard part of AI characters, solved." icon={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />
          <FeatureCard title="Photo Studio" body="Backgrounds, outfits, poses, and lighting on demand. Shoot a full campaign without leaving your desk." icon={<><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /></>} />
          <FeatureCard title="Video Studio" body="Turn any frame into motion — reels, ads, and talking clips your audience can’t look away from." icon={<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>} />
          <FeatureCard title="Wardrobe & styling" body="Build a signature wardrobe and swap outfits in a click to keep the feed fresh and on-brand." icon={<><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" /></>} />
          <FeatureCard title="Brand deals" body="Generate pitch-ready campaign sheets and product shots that land sponsorships and repeat clients." icon={<><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></>} />
          <FeatureCard title="AI prompt assist" body="Stuck on captions or concepts? Built-in AI writes prompts, hooks, and post ideas in your voice." icon={<><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4" /></>} />
        </div>
      </Section>

      {/* Monetize / audiences + regions */}
      <Section id="monetize" tint style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow color={M.pink}>Turn it into a business</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>Built to sell — in the US and across Europe</H2></Reveal>
        <Reveal delay={0.1}><Lead>Whether you’re a solo creator or an agency, Vymotion is a service you can sell. Bill clients in dollars, pounds, or euros — Vymotion handles worldwide tax and payments.</Lead></Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }} className="grid-3">
          {[
            ['Creators', 'Grow your own AI persona, sign brand deals, and sell shoutouts, UGC, and subscriptions.', <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>],
            ['Agencies', 'Spin up a roster of AI influencers for clients. Deliver monthly content packages at software margins.', <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" /></>],
            ['Brands', 'Launch a branded virtual spokesperson that’s always on-message, on-budget, and on-brand.', <><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></>],
          ].map(([t, b, icon], i) => (
            <Reveal key={t} delay={i * 0.05} style={{ ...mCard, padding: 24 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(199,242,78,0.12)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: M.ink, margin: '0 0 7px' }}>{t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: M.sub, margin: 0 }}>{b}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: M.faint, marginRight: 4 }}>Selling in</span>
          {['🇺🇸 United States', '🇬🇧 United Kingdom', '🇪🇺 European Union', '🇨🇦 Canada', '🌍 Worldwide'].map((r) => (
            <span key={r} style={{ fontSize: 13, fontWeight: 600, color: M.ink, padding: '7px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: `1px solid ${M.line}` }}>{r}</span>
          ))}
        </Reveal>
      </Section>

      {/* Pricing teaser */}
      <Section style={{ borderTop: `1px solid ${M.line}` }}>
        <div style={{ ...mCard, padding: 'clamp(28px, 5vw, 52px)', textAlign: 'center', background: 'linear-gradient(180deg, rgba(199,242,78,0.06), rgba(255,255,255,0.02))' }}>
          <Reveal><Eyebrow>Simple pricing</Eyebrow></Reveal>
          <Reveal delay={0.05}><H2 style={{ margin: '0 auto' }}>Start free. Scale when you grow.</H2></Reveal>
          <Reveal delay={0.1}><Lead style={{ margin: '16px auto 0', textAlign: 'center' }}>Credits power everything — images, video, and prompts. You’re only charged for delivered generations; failed ones are always refunded.</Lead></Reveal>
          <Reveal delay={0.14} style={{ display: 'flex', gap: 26, justifyContent: 'center', flexWrap: 'wrap', margin: '30px 0' }}>
            {[['Free', 'Explore only'], ['Starter', '$5/mo'], ['Creator', '$29/mo'], ['Pro', '$69/mo'], ['Studio', '$179/mo']].map(([p, v]) => (
              <div key={p} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: M.faint }}>{p}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: M.ink, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.18} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTA onClick={() => navigate('/create')}>Create your influencer →</CTA>
            <CTA kind="ghost" onClick={() => navigate('/pricing')}>Compare plans</CTA>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" style={{ borderTop: `1px solid ${M.line}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 40, alignItems: 'start' }} className="grid-faq">
          <div>
            <Reveal><Eyebrow>FAQ</Eyebrow></Reveal>
            <Reveal delay={0.05}><H2>Questions, answered</H2></Reveal>
            <Reveal delay={0.1}><Lead>Everything you need to know before you start. Still curious? <a href="mailto:hello@vymotion.org" style={{ color: M.brand, textDecoration: 'none' }}>Email us</a>.</Lead></Reveal>
          </div>
          <Reveal delay={0.06}>
            {FAQ.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)} />
            ))}
          </Reveal>
        </div>
      </Section>

      {/* Final CTA */}
      <Section style={{ borderTop: `1px solid ${M.line}`, textAlign: 'center' }}>
        <Reveal><H2 style={{ margin: '0 auto', maxWidth: 640 }}>Your AI influencer is five minutes away</H2></Reveal>
        <Reveal delay={0.06}><Lead style={{ margin: '16px auto 30px', textAlign: 'center' }}>Sign up, claim your free credits, and post your first shot today.</Lead></Reveal>
        <Reveal delay={0.1}><CTA onClick={() => navigate('/create')} style={{ padding: '17px 46px', fontSize: 17 }}>Get started free →</CTA></Reveal>
      </Section>

      <Footer />

      <style>{`
        .vy-marquee-mask {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .vy-marquee {
          display: flex;
          width: max-content;
          animation: vy-marquee 64s linear infinite;
          will-change: transform;
        }
        .vy-marquee.reverse { animation-direction: reverse; animation-duration: 72s; }
        .vy-marquee:hover { animation-play-state: paused; }
        @keyframes vy-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        /* The showcase wall keeps scrolling even under reduced-motion — the whole point
           of the section is to show the influencers moving. Hover still pauses it. */
        @media (max-width: 900px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-faq { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 620px) {
          .trust-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 22px !important; }
          .grid-4 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
