// Shared layout for the legal / policy pages (Terms, Privacy, DMCA, Cookies).
// Same always-dark marketing surface as Landing/HowItWorks so the footer links feel
// native. Content is data-driven: pages pass { title, updated, intro, sections } and get
// consistent typography, anchor ids, and a table of contents for longer documents.
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { M } from '../../ui/marketing'
import { useSEO } from '../../ui/seo'
import Footer from '../../components/Footer'

export const LEGAL_EMAIL = 'contact@vymotion.org'

export function Mail({ subject }) {
  const href = subject ? `mailto:${LEGAL_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${LEGAL_EMAIL}`
  return (
    <a href={href} style={{ color: M.brand, textDecoration: 'none', fontWeight: 600 }}>
      {LEGAL_EMAIL}
    </a>
  )
}

// Inline link that stays on the SPA router for internal paths.
export function L({ to, children }) {
  const navigate = useNavigate()
  const external = /^(https?:|mailto:)/.test(to)
  return (
    <a
      href={to}
      target={to.startsWith('http') ? '_blank' : undefined}
      rel={to.startsWith('http') ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (external) return
        e.preventDefault()
        navigate(to)
        window.scrollTo({ top: 0 })
      }}
      style={{ color: M.brand, textDecoration: 'none', fontWeight: 600 }}
    >
      {children}
    </a>
  )
}

const bodyText = { fontSize: 15, lineHeight: 1.75, color: M.sub, margin: '0 0 14px' }

export function P({ children }) {
  return <p style={bodyText}>{children}</p>
}

export function UL({ items }) {
  return (
    <ul style={{ ...bodyText, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

export default function LegalPage({ title, eyebrow = 'Legal', updated, description, path, intro, sections, children }) {
  const location = useLocation()
  useSEO({ title, description, path })

  // Land on #anchor links (e.g. /terms#likeness) after the content mounts.
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0 })
    }
  }, [location.hash])

  return (
    <div style={{ background: M.bg, color: M.ink, minHeight: '100vh' }}>
      {/* Header band */}
      <div style={{ padding: 'calc(var(--nav-h) + 56px) 24px 44px', borderBottom: `1px solid ${M.line}`, background: M.bgTop }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: M.brand }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: M.brand }} />
            {eyebrow}
          </div>
          <h1 style={{ fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 800, letterSpacing: '-1.4px', lineHeight: 1.08, margin: 0 }}>
            {title}
          </h1>
          {updated && (
            <p style={{ margin: '14px 0 0', fontSize: 13, color: M.faint }}>Last updated: {updated}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '44px 24px 90px' }}>
        {intro && <div style={{ marginBottom: 30 }}>{intro}</div>}

        {sections && sections.length > 3 && (
          <nav aria-label="Table of contents" style={{ background: M.card, border: `1px solid ${M.line}`, borderRadius: 12, padding: '18px 22px', marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: M.faint, marginBottom: 10 }}>On this page</div>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }}
                    style={{ color: M.sub, textDecoration: 'none', fontSize: 14 }}
                  >
                    {s.h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {sections?.map((s) => (
          <section key={s.id} id={s.id} style={{ scrollMarginTop: 'calc(var(--nav-h) + 20px)', marginBottom: 34 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', color: M.ink, margin: '0 0 12px' }}>{s.h}</h2>
            {s.body}
          </section>
        ))}

        {children}
      </div>

      <Footer />
    </div>
  )
}
