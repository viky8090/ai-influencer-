// Shared building blocks for the always-dark marketing surface (Landing, How it works,
// Earnings, Footer). Editorial Studio: solid near-black canvas, lime CTAs, no glass glow.
import { useEffect, useRef, useState } from 'react'

export const M = {
  bg: '#0A0A0B',
  bgTop: '#0A0A0B',
  ink: '#F4F4F5',
  sub: 'rgba(255,255,255,0.58)',
  faint: 'rgba(255,255,255,0.40)',
  line: 'rgba(255,255,255,0.10)',
  lineSoft: 'rgba(255,255,255,0.06)',
  card: '#151517',
  cardHi: '#1C1C1F',
  brand: '#C7F24E',
  brandInk: '#0A0A0B',
  pink: '#FF3D8B',
  teal: '#38C7B6',
}

export const mCard = {
  background: M.card,
  border: `1px solid ${M.line}`,
  borderRadius: 12,
}

export function Reveal({ children, delay = 0, as: Tag = 'div', style, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(12px)',
        transition: `opacity 0.4s var(--ease-out) ${delay}s, transform 0.4s var(--ease-out) ${delay}s`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Section({ children, id, tint = false, style }) {
  return (
    <section id={id} style={{ position: 'relative', padding: '80px 24px', ...style }}>
      {tint && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'rgba(199,242,78,0.03)',
        }} />
      )}
      <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative' }}>{children}</div>
    </section>
  )
}

export function Eyebrow({ children, color = M.brand }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
      fontSize: 12, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      {children}
    </div>
  )
}

export function H2({ children, style }) {
  return (
    <h2 style={{
      fontSize: 'clamp(28px, 4.2vw, 42px)', fontWeight: 800, letterSpacing: '-1.2px',
      lineHeight: 1.08, color: M.ink, margin: 0, ...style,
    }}>
      {children}
    </h2>
  )
}

export function Lead({ children, style }) {
  return (
    <p style={{
      fontSize: 17, lineHeight: 1.65, color: M.sub, margin: '14px 0 0', maxWidth: 620, ...style,
    }}>
      {children}
    </p>
  )
}

export function CTA({ children, onClick, kind = 'primary', style, ...rest }) {
  const primary = kind === 'primary'
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => { if (primary) e.currentTarget.style.filter = 'brightness(1.05)' }}
      onMouseLeave={(e) => { if (primary) e.currentTarget.style.filter = 'none' }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer',
        transition: 'transform 0.12s var(--ease-out), filter 0.15s var(--ease-out)',
        ...(primary
          ? { background: M.brand, color: M.brandInk, border: '1px solid transparent' }
          : { background: M.cardHi, color: M.ink, border: `1px solid ${M.line}` }),
        ...style,
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      {...rest}
    >
      {children}
    </button>
  )
}
