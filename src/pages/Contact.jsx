// Contact — /contact. Email-first (no backend form to maintain or spam-protect):
// channel cards route each request type to the right mailto subject so triage is easy.
import { useNavigate } from 'react-router-dom'
import { M, Section, Eyebrow, Lead, Reveal, mCard } from '../ui/marketing'
import { useSEO } from '../ui/seo'
import Footer from '../components/Footer'

const EMAIL = 'contact@vymotion.org'

const CHANNELS = [
  {
    k: 'Product & support',
    d: 'Something broken, a generation stuck, or a question about how a feature works? Include your account email and, if it concerns a generation, roughly when you ran it.',
    subject: 'Support request',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><circle cx="12" cy="16.2" r="0.6" fill="currentColor" /></>,
  },
  {
    k: 'Billing & credits',
    d: 'Charges, refunds, plan changes, or a credit balance that looks wrong. Most billing self-service (invoices, cancel, payment method) is in Settings → Billing.',
    subject: 'Billing issue',
    icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
  },
  {
    k: 'Privacy requests',
    d: 'Access, export, correction, or deletion of your personal data — see the Privacy Policy for what we hold. We respond within 30 days.',
    subject: 'Privacy request',
    icon: <><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /></>,
  },
  {
    k: 'DMCA & likeness reports',
    d: 'Copyright takedowns, counter-notices, or reports that content uses a real person’s likeness without consent. The DMCA page lists exactly what a valid notice must include.',
    subject: 'DMCA takedown notice',
    icon: <><path d="M12 3v18" /><path d="M5 7h14" /><path d="M5 7l-2 5a3.5 3.5 0 0 0 7 0L8 7M19 7l-2 5a3.5 3.5 0 0 0 7 0l-2-5" transform="scale(0.82) translate(2.6 2)" /></>,
  },
  {
    k: 'Partnerships & agencies',
    d: 'Volume plans, agency workflows, brand collaborations, or press. Tell us who you are and what you have in mind.',
    subject: 'Partnership inquiry',
    icon: <><path d="M8 12l3 3 5-6" /><circle cx="12" cy="12" r="9" /></>,
  },
  {
    k: 'Security reports',
    d: 'Found a vulnerability? Please report it privately with steps to reproduce — we read these first and won’t take action against good-faith research.',
    subject: 'Security report',
    icon: <><path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" /><path d="M9.5 12l2 2 3.5-4" /></>,
  },
]

export default function Contact() {
  const navigate = useNavigate()
  useSEO({
    title: 'Contact Vymotion — Support, Billing, Legal',
    description: 'Reach the Vymotion team: product support, billing and credits, privacy requests, DMCA notices, security reports, and partnership inquiries.',
    path: '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Vymotion',
      url: 'https://vymotion.org/contact',
    },
  })

  return (
    <div style={{ background: M.bg, color: M.ink, minHeight: '100vh' }}>
      {/* Header band */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: 'calc(var(--nav-h) + 70px) 24px 64px', textAlign: 'center', background: M.bgTop, borderBottom: `1px solid ${M.line}` }}>
        <div style={{ position: 'absolute', width: '50vmax', height: '50vmax', top: '-30%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(199,242,78,0.10) 0%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <Reveal><Eyebrow>Contact</Eyebrow></Reveal>
          <Reveal delay={0.05}>
            <h1 style={{ fontSize: 'clamp(36px, 5.6vw, 56px)', fontWeight: 800, letterSpacing: '-1.8px', lineHeight: 1.06, margin: 0 }}>
              Talk to a human
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <Lead style={{ margin: '16px auto 0', textAlign: 'center' }}>
              One inbox, read every day. Pick the topic below so your message lands with the right context — we usually reply
              within one business day.
            </Lead>
          </Reveal>
          <Reveal delay={0.14} style={{ marginTop: 26 }}>
            <a
              href={`mailto:${EMAIL}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 10,
                background: M.brand, color: M.brandInk, fontSize: 16, fontWeight: 800, textDecoration: 'none',
              }}
            >
              {EMAIL}
            </a>
          </Reveal>
        </div>
      </div>

      {/* Channel cards */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 18 }}>
          {CHANNELS.map((ch, i) => (
            <Reveal key={ch.k} delay={Math.min(i * 0.04, 0.2)}>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(ch.subject)}`}
                style={{ ...mCard, display: 'flex', flexDirection: 'column', gap: 12, padding: 24, height: '100%', textDecoration: 'none', color: 'inherit', boxSizing: 'border-box' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(199,242,78,0.45)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = M.line }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(199,242,78,0.12)', color: M.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{ch.icon}</svg>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', color: M.ink }}>{ch.k}</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: M.sub, flex: 1 }}>{ch.d}</p>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: M.brand }}>Email us →</span>
              </a>
            </Reveal>
          ))}
        </div>

        {/* Self-serve pointers */}
        <Reveal style={{ ...mCard, marginTop: 28, padding: '22px 26px', display: 'flex', flexWrap: 'wrap', gap: '10px 28px', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, color: M.faint }}>Faster than email:</span>
          {[
            ['Documentation', '/docs'],
            ['How it works', '/how-it-works'],
            ['Pricing & plans', '/pricing'],
            ['Terms of Service', '/terms'],
            ['Privacy Policy', '/privacy'],
          ].map(([label, to]) => (
            <a
              key={to}
              href={to}
              onClick={(e) => { e.preventDefault(); navigate(to); window.scrollTo({ top: 0 }) }}
              style={{ fontSize: 14, fontWeight: 700, color: M.ink, textDecoration: 'none', borderBottom: `1px solid ${M.line}` }}
            >
              {label}
            </a>
          ))}
        </Reveal>
      </Section>

      <Footer />
    </div>
  )
}
