// Hand-rolled SVG charts for the marketing pages — no chart library (the bundle already
// warns on size). Each animates once when scrolled into view. Figures are market estimates
// for the AI / virtual-influencer and creator economy; treated as illustrative, not a
// promise of individual earnings (the pages carry a disclaimer).
import { useEffect, useRef, useState } from 'react'
import { M } from './marketing'

function useInView(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setInView(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView]
}

const fmtUsd = (n) => '$' + Math.round(n).toLocaleString('en-US')

// ── Growth area chart — e.g. market size by year ─────────────────────────────
export function GrowthChart({ data, valueFormat = (v) => `$${v}B`, height = 260, accent = M.brand }) {
  const [ref, inView] = useInView(0.25)
  const W = 640, H = height, padL = 44, padR = 20, padT = 26, padB = 34
  const max = Math.max(...data.map((d) => d.value)) * 1.08
  const x = (i) => padL + (i / (data.length - 1)) * (W - padL - padR)
  const y = (v) => H - padB - (v / max) * (H - padT - padB)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(data.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const uid = 'g' + Math.round(max * 100)

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Market growth chart">
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={M.lineSoft} strokeWidth="1" />
            <text x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={M.faint}>{valueFormat(Math.round(v))}</text>
          </g>
        ))}
        <path d={area} fill={`url(#fill-${uid})`} style={{ opacity: inView ? 1 : 0, transition: 'opacity 1.1s ease 0.3s' }} />
        <path
          d={line} fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
          pathLength="1"
          style={{
            strokeDasharray: 1, strokeDashoffset: inView ? 0 : 1,
            transition: 'stroke-dashoffset 1.4s var(--ease-liquid)',
          }}
        />
        {data.map((d, i) => {
          const last = i === data.length - 1
          return (
            <g key={i} style={{ opacity: inView ? 1 : 0, transition: `opacity 0.5s ease ${0.6 + i * 0.08}s` }}>
              <circle cx={x(i)} cy={y(d.value)} r={last ? 5 : 3} fill={last ? accent : M.bg} stroke={accent} strokeWidth="2" />
              {last && <circle cx={x(i)} cy={y(d.value)} r="5" fill="none" stroke={accent} strokeWidth="2" style={{ transformOrigin: `${x(i)}px ${y(d.value)}px`, animation: 'ping 2.2s ease-out infinite' }} />}
              <text x={x(i)} y={H - padB + 20} textAnchor="middle" fontSize="11.5" fill={last ? accent : M.faint} fontWeight={last ? 800 : 500}>{d.label}</text>
              {last && <text x={x(i)} y={y(d.value) - 14} textAnchor="middle" fontSize="13" fontWeight="800" fill={accent}>{valueFormat(d.value)}</text>}
            </g>
          )
        })}
      </svg>
      <style>{`@keyframes ping { 0% { transform: scale(1); opacity: 0.9 } 80%,100% { transform: scale(2.8); opacity: 0 } }`}</style>
    </div>
  )
}

// ── Horizontal tier bars — e.g. sponsored-post rate by follower tier ─────────
export function TierBars({ data, accent = M.brand }) {
  const [ref, inView] = useInView(0.3)
  const max = Math.max(...data.map((d) => d.bar))
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {data.map((d, i) => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: M.ink }}>{d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{d.value}</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: inView ? `${(d.bar / max) * 100}%` : '0%',
              background: `linear-gradient(90deg, ${accent}, ${M.teal})`,
              boxShadow: `0 0 18px ${accent}55`,
              transition: `width 1.1s var(--ease-liquid) ${0.15 + i * 0.1}s`,
            }} />
          </div>
          {d.note && <div style={{ fontSize: 11.5, color: M.faint, marginTop: 5 }}>{d.note}</div>}
        </div>
      ))}
    </div>
  )
}

// ── Donut / progress ring ────────────────────────────────────────────────────
export function Donut({ pct, label, sub, size = 132, accent = M.brand }) {
  const [ref, inView] = useInView(0.4)
  const r = size / 2 - 12
  const circ = 2 * Math.PI * r
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={inView ? circ * (1 - pct / 100) : circ}
            style={{ transition: 'stroke-dashoffset 1.3s var(--ease-liquid)', filter: `drop-shadow(0 0 8px ${accent}66)` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: M.ink }}>{pct}%</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: M.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: M.faint, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Live-momentum counter — animates upward while on screen ──────────────────
// Framed as market momentum (estimated), not a literal live feed.
export function LiveTicker({ base, ratePerSec, label, format = fmtUsd }) {
  const [ref, inView] = useInView(0.5)
  const [val, setVal] = useState(base)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    let raf
    const tick = (now) => {
      setVal(base + ((now - start) / 1000) * ratePerSec)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, base, ratePerSec])
  return (
    <div ref={ref}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: M.brand, boxShadow: `0 0 10px ${M.brand}`, animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: M.faint }}>{label}</span>
      </div>
      <div style={{ fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', color: M.brand, fontVariantNumeric: 'tabular-nums' }}>
        {format(val)}
      </div>
      <style>{`@keyframes pulse-dot { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </div>
  )
}

// ── Compact stat pill ────────────────────────────────────────────────────────
export function StatPill({ value, label, accent = M.brand }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 10px' }}>
      <div style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-1.2px', color: accent }}>{value}</div>
      <div style={{ fontSize: 12.5, color: M.faint, marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  )
}
