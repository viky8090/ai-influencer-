// Real 404 page. This replaces the old `<Navigate to="/" replace />` catch-all, which made
// every bad URL answer 200 with homepage content — Google reports that as a "soft 404" and
// it lets typo'd or expired links quietly dilute the homepage's own signals.
//
// A static host can't return a 404 status for an SPA route, so the honest signal we *can*
// send is `noindex` (via the route manifest) plus a page that clearly says the URL is gone
// and routes the visitor somewhere useful.
import { useNavigate, useLocation } from 'react-router-dom'
import { M, Section, Eyebrow, Lead, CTA } from '../ui/marketing'
import { useSEO } from '../ui/seo'
import { PRIMARY_LINKS } from '../ui/seoRoutes'
import Footer from '../components/Footer'

export default function NotFound() {
  const navigate = useNavigate()
  const location = useLocation()
  useSEO({ path: '/404' })

  return (
    <div style={{ background: M.bg, color: M.ink, minHeight: '100vh' }}>
      <Section style={{ paddingTop: 'calc(var(--nav-h) + 80px)', textAlign: 'center' }}>
        <Eyebrow>Error 404</Eyebrow>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 62px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, margin: '10px 0 0' }}>
          This page doesn’t exist
        </h1>
        <Lead style={{ margin: '18px auto 0', textAlign: 'center' }}>
          Nothing lives at <code style={{ color: M.brandText, fontSize: '0.95em' }}>{location.pathname}</code>.
          It may have moved, or the link may be mistyped. Here’s everything else:
        </Lead>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', margin: '34px auto 0', maxWidth: 720 }}>
          {PRIMARY_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={(e) => { e.preventDefault(); navigate(href); window.scrollTo({ top: 0 }) }}
              style={{
                fontSize: 14, fontWeight: 600, color: M.ink, textDecoration: 'none',
                padding: '9px 16px', borderRadius: 999,
                background: 'var(--m-surface-soft)', border: `1px solid ${M.line}`,
              }}
            >
              {label}
            </a>
          ))}
        </div>

        <div style={{ marginTop: 36 }}>
          <CTA onClick={() => navigate('/')}>Back to the studio →</CTA>
        </div>
      </Section>
      <Footer />
    </div>
  )
}
