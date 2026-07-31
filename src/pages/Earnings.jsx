import { useNavigate } from 'react-router-dom'
import { M, Section, Eyebrow, H2, Lead, CTA, Reveal, mCard } from '../ui/marketing'
import { GrowthChart, TierBars, LiveTicker, Donut, StatPill } from '../ui/charts'
import { MARKET_GROWTH, TIER_EARNINGS, CREATOR_SPEND_PER_SEC, REGIONS, FAQ } from '../ui/marketData'
import { useSEO } from '../ui/seo'
import Footer from '../components/Footer'

const WAYS = [
  ['brands', 'Brand deals & sponsorships', 'The biggest earner. Brands pay for posts, stories, and campaigns. Vymotion generates pitch-ready shots and campaign sheets that help you close.', <><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></>],
  ['services', 'Sell UGC & content services', 'Businesses need a constant stream of content. Package monthly photo/video deliverables and sell them — to local shops or global brands.', <><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.5" /></>],
  ['creators', 'Affiliate & shop links', 'Earn commission on every sale your influencer drives. Perfect for fashion, beauty, fitness, and tech niches.', <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></>],
  ['creators', 'Subscriptions & fan support', 'Exclusive content behind a paywall — subscriptions, tips, and memberships from your most loyal audience.', <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></>],
  ['creators', 'Shoutouts & collabs', 'Sell shoutouts to smaller creators and brands, or collaborate with other accounts to cross-grow.', <><path d="M3 11l19-9-9 19-2-8-8-2z" /></>],
  ['agencies', 'Licensing & agency work', 'License your character, or run Vymotion as an agency — building and managing AI influencers for multiple clients at software margins.', <><path d="M3 21h18M5 21V7l7-4 7 4v14M10 12h4M10 16h4" /></>],
]

export default function Earnings() {
  const navigate = useNavigate()
  useSEO({
    path: '/earnings',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQ.slice(0, 4).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  })

  return (
    <div style={{ background: M.bg, color: M.ink }}>
      {/* Header band */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 'calc(var(--nav-h) + 70px) 24px 66px', textAlign: 'center', background: M.bgTop, borderBottom: `1px solid ${M.line}` }}>
        <div style={{ position: 'absolute', width: '50vmax', height: '50vmax', top: '-30%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, var(--m-pink-soft) 0%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 780, margin: '0 auto', position: 'relative' }}>
          <Reveal><Eyebrow color={M.pink}>Earn with AI influencers</Eyebrow></Reveal>
          <Reveal delay={0.05}><h1 style={{ fontSize: 'clamp(38px, 6vw, 62px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, margin: 0 }}>How AI influencers make money</h1></Reveal>
          <Reveal delay={0.1}><Lead style={{ margin: '18px auto 0', textAlign: 'center' }}>Virtual creators are pulling real budgets — from five-figure brand campaigns to steady UGC retainers. Here’s the market, the numbers, and every way to turn a following into income.</Lead></Reveal>
        </div>
      </div>

      {/* Market + momentum */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }} className="earn-2">
          <Reveal style={{ ...mCard, padding: '26px 26px 20px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: M.ink }}>The market is compounding fast</div>
            <div style={{ fontSize: 12.5, color: M.faint, margin: '3px 0 14px' }}>Virtual-influencer market size, USD billions — estimate</div>
            <GrowthChart data={MARKET_GROWTH} valueFormat={(v) => `$${v}B`} />
          </Reveal>
          <Reveal delay={0.06} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...mCard, padding: 24 }}>
              <LiveTicker base={0} ratePerSec={CREATOR_SPEND_PER_SEC} label="Creator-economy spend since you arrived (est.)" />
              <p style={{ fontSize: 12.5, color: M.faint, margin: '10px 0 0', lineHeight: 1.5 }}>Heading toward ~$480B/yr by 2027 — the pie you’re taking a slice of.</p>
            </div>
            <div style={{ ...mCard, padding: 24, display: 'flex', justifyContent: 'space-around', gap: 8 }}>
              <Donut pct={62} label="Brands open to" sub="AI / virtual creators" />
              <Donut pct={3 * 33} label="~3× engagement" sub="vs human creators" accent={M.pink} />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Earning potential by tier */}
      <Section style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow>Earning potential</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>What creators charge, by audience size</H2></Reveal>
        <Reveal delay={0.1}><Lead>You don’t need millions of followers to earn. Nano and micro accounts often earn the most per follower because their audiences are the most engaged.</Lead></Reveal>
        <Reveal delay={0.06} style={{ ...mCard, padding: 'clamp(24px, 3vw, 34px)', marginTop: 34 }}>
          <TierBars data={TIER_EARNINGS} />
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginTop: 26, paddingTop: 22, borderTop: `1px solid ${M.lineSoft}`, justifyContent: 'space-around' }}>
            <StatPill value="$50" label="entry per-post rate" />
            <StatPill value="$5K+" label="typical micro campaign" />
            <StatPill value="$25K+" label="flagship macro deal" />
            <StatPill value="24/7" label="posting, no shoots" />
          </div>
        </Reveal>
        <p style={{ fontSize: 12, color: M.faint, marginTop: 16, maxWidth: 720 }}>Figures are industry estimates and vary widely by niche, region, engagement, and negotiation. They are not a guarantee of income.</p>
      </Section>

      {/* Ways to monetize */}
      <Section tint style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow>Six income streams</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>Every way to monetize your influencer</H2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 34 }} className="earn-3">
          {WAYS.map(([id, t, b, icon], i) => (
            <Reveal key={t} id={id} delay={(i % 3) * 0.05} style={{ ...mCard, padding: 24, scrollMarginTop: 90 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--m-accent-soft)', color: M.brandText, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, color: M.ink, margin: '0 0 7px' }}>{t}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: M.sub, margin: 0 }}>{b}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Regional markets: USA + Europe */}
      <Section style={{ borderTop: `1px solid ${M.line}` }}>
        <Reveal><Eyebrow color={M.pink}>Sell in the US & Europe</Eyebrow></Reveal>
        <Reveal delay={0.05}><H2>Two of the world’s biggest creator markets</H2></Reveal>
        <Reveal delay={0.1}><Lead>Vymotion is built to sell across borders. Bill clients in their currency; worldwide sales tax and VAT are handled for you.</Lead></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 34 }} className="earn-2">
          {REGIONS.map((r, i) => (
            <Reveal key={r.id} id={r.id} delay={i * 0.06} style={{ ...mCard, padding: 'clamp(24px, 3vw, 32px)', scrollMarginTop: 90 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 30 }}>{r.flag}</span>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: M.ink, letterSpacing: '-0.4px' }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: M.faint }}>{r.marketLabel}</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 800, color: M.brandText, letterSpacing: '-1px' }}>{r.market}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {r.stats.map(([v, l]) => (
                  <div key={l} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: M.ink, minWidth: 92 }}>{v}</span>
                    <span style={{ fontSize: 13.5, color: M.sub, lineHeight: 1.5 }}>{l}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: M.sub, margin: '18px 0 0', paddingTop: 16, borderTop: `1px solid ${M.lineSoft}` }}>{r.note}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* How Vymotion helps you sell */}
      <Section tint style={{ borderTop: `1px solid ${M.line}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="earn-2">
          <div>
            <Reveal><Eyebrow>Built to close deals</Eyebrow></Reveal>
            <Reveal delay={0.05}><H2>Vymotion does the selling groundwork</H2></Reveal>
            <Reveal delay={0.1}><Lead>Content is only half the job — you have to pitch it. Vymotion gives you the assets and the billing to run this like a real business.</Lead></Reveal>
            <Reveal delay={0.14} style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <CTA onClick={() => navigate('/create')}>Start earning free →</CTA>
              <CTA kind="ghost" onClick={() => navigate('/pricing')}>See plans</CTA>
            </Reveal>
          </div>
          <Reveal delay={0.06} style={{ ...mCard, padding: 26 }}>
            {[
              ['Campaign-ready shots', 'Brand-deal sheets and product mockups that make pitches easy to say yes to.'],
              ['Global billing built in', 'Charge clients in USD, GBP, or EUR — Vymotion remits worldwide tax as merchant of record.'],
              ['Commercial license', 'Paid plans include the rights to use your generated content commercially.'],
              ['Scale to an agency', 'Manage multiple influencers and client rosters from one account.'],
            ].map((row, i) => (
              <div key={row[0]} style={{ display: 'flex', gap: 14, padding: '15px 0', borderTop: i === 0 ? 'none' : `1px solid ${M.lineSoft}` }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: 'var(--m-accent-soft)', color: M.brandText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: M.ink }}>{row[0]}</div>
                  <div style={{ fontSize: 13, color: M.sub, marginTop: 2, lineHeight: 1.5 }}>{row[1]}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* CTA */}
      <Section style={{ borderTop: `1px solid ${M.line}`, textAlign: 'center' }}>
        <Reveal><H2 style={{ margin: '0 auto', maxWidth: 640 }}>Start building an income stream today</H2></Reveal>
        <Reveal delay={0.06}><Lead style={{ margin: '16px auto 30px', textAlign: 'center' }}>Free credits on sign-up. Your first brand-deal sheet is minutes away.</Lead></Reveal>
        <Reveal delay={0.1}><CTA onClick={() => navigate('/create')} style={{ padding: '17px 46px', fontSize: 17 }}>Create your influencer →</CTA></Reveal>
      </Section>

      <Footer />

      <style>{`
        @media (max-width: 860px) {
          .earn-2 { grid-template-columns: 1fr !important; }
          .earn-3 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) { .earn-3 { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
