import { useNavigate } from 'react-router-dom'
import { M, Section, Eyebrow, H2, Lead, CTA, Reveal, mCard } from '../ui/marketing'
import { useSEO, SITE_URL } from '../ui/seo'
import Footer from '../components/Footer'

const STEPS = [
  {
    k: 'Design your influencer',
    d: 'Choose a face, body type, age, ethnicity, personality, and niche — or start from a template. Vymotion locks in a consistent identity so the same person shows up in every future shot. This is the foundation everything else builds on.',
    bullets: ['Pick look, vibe, and niche', 'Auto-generated backstory & personality', 'Identity stays consistent forever'],
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  },
  {
    k: 'Shoot in the Photo Studio',
    d: 'Generate photos in any setting — café, beach, runway, gym — with full control over outfits, poses, and lighting. Build a signature wardrobe and reuse it. A full campaign’s worth of images in the time a real shoot spends on setup.',
    bullets: ['Backgrounds, outfits, poses on demand', 'Wardrobe you can save and reuse', '1K–4K, watermark-free on paid plans'],
    icon: <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /></>,
  },
  {
    k: 'Bring it to life with video',
    d: 'Turn any frame into motion — reels, product clips, and short ads. Video is what stops the scroll and what brands pay the most for, and Vymotion makes it a click instead of an edit suite.',
    bullets: ['Image-to-video in the Video Studio', 'Reels & ad-ready clips', 'No editing software needed'],
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  },
  {
    k: 'Post & grow the audience',
    d: 'Publish consistently across Instagram, TikTok, YouTube, and X. Use the built-in AI to write captions, hooks, and a content calendar so the feed never runs dry. Consistency is what compounds a following.',
    bullets: ['AI captions & post ideas in your voice', 'Plan a calendar that never runs dry', 'Built for every major platform'],
    icon: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>,
  },
  {
    k: 'Monetize',
    d: 'Once you have an audience, turn it into income: brand deals, UGC packages sold to businesses, affiliate links, shoutouts, subscriptions, and licensing. Generate pitch-ready brand-deal sheets to close sponsors faster.',
    bullets: ['Brand-deal & campaign sheets', 'Sell UGC to US & EU businesses', 'Bill in USD, GBP, or EUR'],
    icon: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  },
]

const CHECKLIST = [
  'Create your first influencer (2 min)',
  'Generate a set of 4 profile photos',
  'Try one outfit swap in the Wardrobe',
  'Render your first short video clip',
  'Draft 3 captions with AI assist',
  'Save a brand-deal sheet for outreach',
]

export default function HowItWorks() {
  const navigate = useNavigate()
  useSEO({
    title: 'How It Works — Create an AI Influencer Step by Step',
    description: 'A step-by-step guide to building and monetizing an AI influencer with Vymotion: design a consistent persona, shoot photos and video, grow an audience, and land brand deals.',
    path: '/how-it-works',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'HowTo', name: 'How to create an AI influencer with Vymotion',
      step: STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.k, text: s.d })),
    },
  })

  return (
    <div style={{ background: M.bg, color: M.ink }}>
      {/* Header band */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 'calc(var(--nav-h) + 70px) 24px 70px', textAlign: 'center', background: M.bgTop, borderBottom: `1px solid ${M.line}` }}>
        <div style={{ position: 'absolute', width: '50vmax', height: '50vmax', top: '-30%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(199,242,78,0.10) 0%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <Reveal><Eyebrow>How it works</Eyebrow></Reveal>
          <Reveal delay={0.05}><h1 style={{ fontSize: 'clamp(38px, 6vw, 62px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, margin: 0 }}>From blank canvas to a paid AI influencer</h1></Reveal>
          <Reveal delay={0.1}><Lead style={{ margin: '18px auto 0', textAlign: 'center' }}>Five steps, no camera, no crew, no editing skills. Here’s exactly how creators go from an idea to an income-generating virtual influencer.</Lead></Reveal>
          <Reveal delay={0.14} style={{ marginTop: 30 }}><CTA onClick={() => navigate('/create')}>Start creating free →</CTA></Reveal>
        </div>
      </div>

      {/* Steps */}
      <Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.k} style={{ ...mCard, padding: 'clamp(22px, 3vw, 34px)', display: 'grid', gridTemplateColumns: '64px 1fr', gap: 22, alignItems: 'start' }} className="how-step">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(199,242,78,0.12)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,0.16)', letterSpacing: '-1px' }}>{String(i + 1).padStart(2, '0')}</div>
              </div>
              <div>
                <h2 style={{ fontSize: 'clamp(21px, 2.6vw, 27px)', fontWeight: 800, letterSpacing: '-0.6px', margin: '2px 0 10px', color: M.ink }}>{s.k}</h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.7, color: M.sub, margin: '0 0 16px', maxWidth: 640 }}>{s.d}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {s.bullets.map((b) => (
                    <span key={b} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: M.ink, padding: '7px 13px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${M.line}` }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={M.brand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>{b}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* First 10 minutes checklist */}
      <Section tint style={{ borderTop: `1px solid ${M.line}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="how-check">
          <div>
            <Reveal><Eyebrow>Onboarding</Eyebrow></Reveal>
            <Reveal delay={0.05}><H2>Your first 10 minutes</H2></Reveal>
            <Reveal delay={0.1}><Lead>New here? Run this quick checklist and you’ll have a posting-ready influencer — and your first brand-deal sheet — before your coffee’s cold.</Lead></Reveal>
            <Reveal delay={0.14} style={{ marginTop: 26 }}><CTA onClick={() => navigate('/create')}>Open the studio →</CTA></Reveal>
          </div>
          <Reveal delay={0.06} style={{ ...mCard, padding: 26 }}>
            {CHECKLIST.map((c, i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: i === 0 ? 'none' : `1px solid ${M.lineSoft}` }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: 'rgba(199,242,78,0.12)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
                <span style={{ fontSize: 14.5, color: M.ink, fontWeight: 500 }}>{c}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* Responsible AI + policy anchors (linked from footer) */}
      <Section style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow color={M.pink}>Responsible AI</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>Create honestly, stay on the right side of the rules</H2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 34 }} className="how-policy">
          {[
            ['policy', 'Likeness & consent', 'Vymotion is for original characters. Don’t recreate a real, identifiable person without their consent. Public-figure impersonation and deceptive deepfakes are not allowed.'],
            ['privacy', 'Your data & privacy', 'Your creations and account data are yours. We store only what’s needed to run your account and never sell your data. Full details in our privacy policy.'],
            ['terms', 'Disclosure & terms', 'We recommend clearly labeling AI-generated content — it’s increasingly required in the US and EU, and audiences reward the transparency. Paid plans include a commercial-use license.'],
          ].map(([id, t, b], i) => (
            <Reveal key={id} id={id} delay={i * 0.05} style={{ ...mCard, padding: 24, scrollMarginTop: 90 }}>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, color: M.ink, margin: '0 0 8px' }}>{t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: M.sub, margin: 0 }}>{b}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section style={{ borderTop: `1px solid ${M.line}`, textAlign: 'center' }}>
        <Reveal><H2 style={{ margin: '0 auto', maxWidth: 620 }}>Ready to build yours?</H2></Reveal>
        <Reveal delay={0.06}><Lead style={{ margin: '16px auto 30px', textAlign: 'center' }}>Free credits on sign-up. No card required.</Lead></Reveal>
        <Reveal delay={0.1} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <CTA onClick={() => navigate('/create')}>Create your influencer →</CTA>
          <CTA kind="ghost" onClick={() => navigate('/earnings')}>See the earnings potential</CTA>
        </Reveal>
      </Section>

      <Footer />

      <style>{`
        @media (max-width: 760px) {
          .how-step { grid-template-columns: 1fr !important; }
          .how-check { grid-template-columns: 1fr !important; }
          .how-policy { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
