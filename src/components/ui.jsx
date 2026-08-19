import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/*
 * Shared UI primitives for the account area (Profile, Settings, Manage
 * account, Community).
 *
 * The rest of the app styles inline with CSS variables, so these do too —
 * they exist to keep one set of decisions (spacing, radii, focus, tone)
 * in one place rather than to introduce a new styling system.
 */

// Brand hues. These stay literal because they are used for gradients and
// decorative tints where an alpha suffix is needed.
export const ACCENT = '#8B5CF6'
export const ACCENT_2 = '#EC4899'
export const GRADIENT = `linear-gradient(135deg, ${ACCENT_2}, ${ACCENT})`

// Semantic colours for text and icons. Tokens rather than literals because
// the iOS-style brights sit near 2:1 on a white surface — the "Connected"
// badge and every warning were unreadable in light mode. index.css defines a
// value per theme; each clears WCAG AA against its own surface.
export const DANGER = 'var(--danger)'
export const SUCCESS = 'var(--success)'
export const WARN = 'var(--warn)'
export const BRAND_INK = 'var(--brand-ink)'

// A solid destructive button paints its own background, so it needs one value
// dark enough for white text in both themes rather than a theme-aware one.
export const DANGER_SOLID = '#C9000F'

// ── Small helpers ────────────────────────────────────────────────

export function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic gradient per name, so an avatar-less user still gets a
// consistent identity colour instead of a grey blob.
export function avatarGradient(seed) {
  const s = String(seed || 'studio')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  const h1 = hash % 360
  const h2 = (h1 + 40 + (hash >> 8) % 60) % 360
  return `linear-gradient(135deg, hsl(${h1} 72% 58%), hsl(${h2} 68% 48%))`
}

export function formatDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

// ── Page frame ───────────────────────────────────────────────────

export function PageShell({ title, subtitle, actions, children, maxWidth = 980 }) {
  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 96px' }}>
        {(title || actions) && (
          <header style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap', marginBottom: 28,
          }}>
            <div style={{ minWidth: 0 }}>
              {title && (
                <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 620 }}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </div>
  )
}

export function Card({ children, padding = 24, style, ...rest }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}

// A card with a titled header, optional description, and an optional
// header-right action. The workhorse of the settings pages.
export function SectionCard({ title, description, action, children, footer, id }) {
  return (
    <section
      id={id}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 20,
        scrollMarginTop: 'calc(var(--nav-h) + 24px)',
      }}
    >
      {(title || action) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 650, letterSpacing: '-0.2px' }}>{title}</h2>
            {description && (
              <p style={{ marginTop: 5, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {description}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div style={{ padding: 24 }}>{children}</div>
      {footer && (
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          fontSize: 13, color: 'var(--text-secondary)',
        }}>
          {footer}
        </div>
      )}
    </section>
  )
}

// One labelled setting with its control on the right.
export function Row({ title, description, control, icon, align = 'center' }) {
  return (
    <div style={{
      display: 'flex', alignItems: align, justifyContent: 'space-between',
      gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 220, flex: '1 1 260px' }}>
        {icon && <span style={{ color: 'var(--text-secondary)', marginTop: 1, display: 'flex' }}>{icon}</span>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          {description && (
            <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {description}
            </div>
          )}
        </div>
      </div>
      {control && <div style={{ flexShrink: 0 }}>{control}</div>}
    </div>
  )
}

export function Divider({ spacing = 20 }) {
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: `${spacing}px 0` }} />
}

// ── Buttons ──────────────────────────────────────────────────────

// `sm` clears 36px tall so the destructive controls (Disconnect, Remove) are
// not the smallest touch targets on the page.
const BUTTON_SIZES = {
  sm: { padding: '9px 14px', fontSize: 13, radius: 'var(--radius-sm)', gap: 6 },
  md: { padding: '10px 18px', fontSize: 14, radius: 'var(--radius-sm)', gap: 8 },
  lg: { padding: '13px 24px', fontSize: 15, radius: 'var(--radius-md)', gap: 9 },
}

// `hover` is an explicit background rather than a brightness filter:
// brightening var(--surface) is a no-op on white and imperceptible on
// #111120, which left every secondary and ghost button dead to the pointer.
function buttonVariant(variant) {
  switch (variant) {
    case 'primary':
      return {
        background: GRADIENT, color: '#fff', border: '1px solid transparent',
        boxShadow: '0 2px 10px rgba(139,92,246,0.28)', hover: null, brighten: true,
      }
    case 'danger':
      return {
        background: 'var(--danger-tint)', color: DANGER,
        border: '1px solid var(--danger-edge)', boxShadow: 'none',
        hover: 'var(--danger-edge)',
      }
    case 'dangerSolid':
      return {
        background: DANGER_SOLID, color: '#fff', border: '1px solid transparent',
        boxShadow: '0 2px 10px rgba(201,0,15,0.28)', hover: null, brighten: true,
      }
    case 'ghost':
      return {
        background: 'transparent', color: 'var(--text-secondary)',
        border: '1px solid transparent', boxShadow: 'none',
        hover: 'var(--surface-hover)',
      }
    case 'secondary':
    default:
      return {
        background: 'var(--surface)', color: 'var(--text-primary)',
        border: '1px solid var(--border)', boxShadow: 'none',
        hover: 'var(--surface-hover)',
      }
  }
}

export function Button({
  variant = 'secondary', size = 'md', loading = false, disabled = false,
  icon, children, style, as, href, target, rel, ...rest
}) {
  const s = BUTTON_SIZES[size] || BUTTON_SIZES.md
  const { hover, brighten, ...v } = buttonVariant(variant)
  const inert = disabled || loading
  const Tag = as || (href ? 'a' : 'button')

  function applyHover(el, on) {
    if (inert) return
    if (hover) el.style.background = on ? hover : v.background
    if (brighten) el.style.filter = on ? 'brightness(1.06)' : 'none'
  }

  return (
    <Tag
      className="focus-ring"
      href={href}
      target={target}
      rel={rel}
      disabled={Tag === 'button' ? inert : undefined}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, padding: s.padding, borderRadius: s.radius,
        fontSize: s.fontSize, fontWeight: 600, fontFamily: 'inherit',
        lineHeight: 1.2, whiteSpace: 'nowrap', textDecoration: 'none',
        cursor: inert ? 'not-allowed' : 'pointer',
        opacity: inert ? 0.55 : 1,
        transition: 'filter 0.15s, background 0.15s, border-color 0.15s, transform 0.1s',
        ...v,
        ...style,
      }}
      onMouseEnter={e => applyHover(e.currentTarget, true)}
      onMouseLeave={e => applyHover(e.currentTarget, false)}
      onMouseDown={e => { if (!inert) e.currentTarget.style.transform = 'translateY(1px)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
      onBlur={e => { e.currentTarget.style.transform = 'none'; applyHover(e.currentTarget, false) }}
      {...rest}
    >
      {loading ? <Spinner size={s.fontSize} /> : icon}
      {children}
    </Tag>
  )
}

export function Spinner({ size = 14, color = 'currentColor' }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%', display: 'inline-block',
        border: `2px solid ${color}`, opacity: 0.35,
        borderTopColor: color,
        animation: 'spin 0.7s linear infinite',
        filter: 'none',
      }}
    />
  )
}

// ── Form controls ────────────────────────────────────────────────

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      disabled={disabled}
      className="focus-ring"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 50, height: 30, borderRadius: 999, padding: 3,
        background: checked ? GRADIENT : 'var(--bg-tertiary)',
        border: `1px solid ${checked ? 'transparent' : 'var(--border-control)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.2s',
      }}
    >
      {/* Translated rather than re-justified so the knob actually slides. */}
      <span style={{
        width: 24, height: 24, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
        transform: `translateX(${checked ? 20 : 0}px)`,
        transition: 'transform 0.2s cubic-bezier(0.34,1.4,0.64,1)',
      }} />
    </button>
  )
}

/*
 * A labelled form control.
 *
 * The hint/error sits OUTSIDE the <label>: anything inside a label becomes
 * part of the control's accessible name, so a bio field would announce as
 * "Bio 0/280" and re-read the counter on every keystroke. Pass `htmlFor` and
 * the matching input `id` to get `aria-describedby` wired up for free.
 */
export function Field({ label, hint, error, htmlFor, children, style }) {
  const describedBy = htmlFor && (error || hint) ? `${htmlFor}-desc` : undefined
  return (
    <div style={{ display: 'block', ...style }}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            display: 'block', fontSize: 12, fontWeight: 650, marginBottom: 7,
            color: 'var(--text-secondary)', letterSpacing: '0.2px',
          }}
        >
          {label}
        </label>
      )}
      {children}
      {(hint || error) && (
        <span
          id={describedBy}
          role={error ? 'alert' : undefined}
          style={{
            display: 'block', marginTop: 6, fontSize: 12, lineHeight: 1.5,
            color: error ? DANGER : 'var(--text-secondary)',
          }}
        >
          {error || hint}
        </span>
      )}
    </div>
  )
}

// --border is a hairline for card edges (~1.2:1). A control needs the 3:1 of
// WCAG 1.4.11 or an empty field is invisible until it is focused.
const inputStyle = {
  width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border-control)', background: 'var(--bg)',
  fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit',
  lineHeight: 1.45,
}

export function TextInput({ prefix, style, ...rest }) {
  if (prefix) {
    return (
      <span style={{
        display: 'flex', alignItems: 'center',
        border: '1.5px solid var(--border-control)', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg)', overflow: 'hidden',
      }}>
        <span style={{
          padding: '10px 0 10px 13px', fontSize: 14,
          color: 'var(--text-tertiary)', userSelect: 'none',
        }}>{prefix}</span>
        <input {...rest} style={{ ...inputStyle, border: 'none', background: 'transparent', paddingLeft: 2, ...style }} />
      </span>
    )
  }
  return <input {...rest} style={{ ...inputStyle, ...style }} />
}

export function TextArea({ style, rows = 4, ...rest }) {
  return <textarea rows={rows} {...rest} style={{ ...inputStyle, resize: 'vertical', ...style }} />
}

/*
 * Radio-style pill group. `options` is [{ value, label, icon }].
 *
 * A real radiogroup: one tab stop, arrow keys move and select. This is the
 * control that picks merge-vs-replace on a restore, so it has to be operable
 * from the keyboard and unmistakable at a glance — the previous selected
 * state was var(--surface) on var(--bg-tertiary), which in dark mode is
 * 1.1:1 and actually darker than the track.
 */
export function Segmented({ options, value, onChange, ariaLabel, size = 'md' }) {
  const pad = size === 'sm' ? '7px 12px' : '9px 14px'
  const refs = useRef([])
  const index = Math.max(0, options.findIndex(o => o.value === value))

  function move(delta) {
    const next = (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  function onKeyDown(e) {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); move(1); break
      case 'ArrowLeft':  case 'ArrowUp':   e.preventDefault(); move(-1); break
      case 'Home':       e.preventDefault(); onChange(options[0].value); refs.current[0]?.focus(); break
      case 'End': {
        e.preventDefault()
        const last = options.length - 1
        onChange(options[last].value)
        refs.current[last]?.focus()
        break
      }
      default: break
    }
  }

  return (
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown} style={{
      display: 'inline-flex', gap: 4, padding: 4,
      background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)', flexWrap: 'wrap',
    }}>
      {options.map((opt, i) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            ref={el => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className="focus-ring"
            onClick={() => onChange(opt.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: pad, borderRadius: 'var(--radius-sm)',
              fontSize: 13.5, fontWeight: on ? 650 : 500, fontFamily: 'inherit',
              background: on ? 'var(--accent-tint)' : 'transparent',
              color: on ? 'var(--brand-ink)' : 'var(--text-secondary)',
              // Transparent border on the unselected pills so selecting one
              // does not shift the layout.
              border: `1px solid ${on ? 'var(--accent-edge)' : 'transparent'}`,
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Display ──────────────────────────────────────────────────────

export function Avatar({ src, name, size = 44, ring = false, style }) {
  const [broken, setBroken] = useState(false)
  // A new src deserves a fresh attempt.
  useEffect(() => { setBroken(false) }, [src])
  const dim = { width: size, height: size, borderRadius: '50%', flexShrink: 0 }
  const ringStyle = ring ? { boxShadow: `0 0 0 3px var(--surface), 0 0 0 5px ${ACCENT}55` } : {}
  // A stored avatar can be a dead CDN URL or an image the browser cannot
  // decode; fall back to the initials rather than rendering a broken image.
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : ''}
        onError={() => setBroken(true)}
        style={{ ...dim, objectFit: 'cover', background: avatarGradient(name), ...ringStyle, ...style }}
      />
    )
  }
  return (
    <span
      aria-hidden={!name}
      style={{
        ...dim,
        background: avatarGradient(name),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, letterSpacing: '0.3px',
        fontSize: Math.max(11, Math.round(size * 0.38)),
        ...ringStyle,
        ...style,
      }}
    >
      {initialsOf(name)}
    </span>
  )
}

// Every tone resolves through theme-aware tokens, so a tint that reads on
// white is not the same alpha that reads on #111120.
export const TONES = {
  neutral: { bg: 'var(--bg-tertiary)',  fg: 'var(--text-secondary)', bd: 'var(--border-subtle)' },
  success: { bg: 'var(--success-tint)', fg: SUCCESS,   bd: 'var(--success-edge)' },
  warn:    { bg: 'var(--warn-tint)',    fg: WARN,      bd: 'var(--warn-edge)' },
  danger:  { bg: 'var(--danger-tint)',  fg: DANGER,    bd: 'var(--danger-edge)' },
  accent:  { bg: 'var(--accent-tint)',  fg: BRAND_INK, bd: 'var(--accent-edge)' },
}

const BADGE_TONES = TONES

export function Badge({ tone = 'neutral', dot = false, children }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: 12, fontWeight: 650, letterSpacing: '0.1px', whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.fg }} />}
      {children}
    </span>
  )
}

export function StatTile({ label, value, hint, icon, tone = 'accent' }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.accent
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && (
          <span style={{
            width: 26, height: 26, borderRadius: 8, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            background: t.bg, color: t.fg,
          }}>{icon}</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--text-secondary)', letterSpacing: '0.2px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>{hint}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, compact = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: compact ? '28px 20px' : '48px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    }}>
      {icon && (
        <span style={{
          width: 48, height: 48, borderRadius: 14, display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', marginBottom: 2,
        }}>{icon}</span>
      )}
      <div style={{ fontSize: 16, fontWeight: 650 }}>{title}</div>
      {description && (
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: 380 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

// ── Overlays ─────────────────────────────────────────────────────

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let modalSeq = 0

/*
 * A modal dialog that actually behaves like one.
 *
 * Three things a bare role="dialog" does not give you, and all three matter
 * when the dialog is "Erase everything?":
 *   - Tab is trapped inside, so you cannot land on the button that opened it.
 *   - The app behind is inert, so a screen reader in browse mode cannot read
 *     or operate the page under the scrim.
 *   - The focus effect depends only on `open`, so a parent re-render does not
 *     yank focus back out to the trigger mid-interaction.
 */
export function Modal({ open, onClose, title, description, children, width = 440 }) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  const closeRef = useRef(onClose)
  const idRef = useRef(null)
  if (idRef.current === null) idRef.current = ++modalSeq

  // Read onClose through a ref so its identity never re-runs the effect below.
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    restoreRef.current = document.activeElement
    const root = document.getElementById('root')
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    if (root) root.setAttribute('inert', '')

    // Focus the first real control if there is one — the confirmation input,
    // typically — otherwise the panel itself.
    const panel = panelRef.current
    const first = panel?.querySelector(FOCUSABLE)
    ;(first || panel)?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return }
      if (e.key !== 'Tab') return
      const items = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])]
      if (!items.length) { e.preventDefault(); return }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === firstItem || !panelRef.current.contains(active))) {
        e.preventDefault(); lastItem.focus()
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault(); firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      if (root) root.removeAttribute('inert')
      const previous = restoreRef.current
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus()
    }
  }, [open])

  if (!open) return null

  const titleId = `modal-${idRef.current}-title`
  const descId = `modal-${idRef.current}-desc`

  return createPortal(
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        style={{
          width: '100%', maxWidth: width, maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: 26,
          border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)',
          animation: 'menu-in 0.16s ease-out',
          outline: 'none',
        }}
      >
        {title && (
          <h2 id={titleId} style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.4px' }}>
            {title}
          </h2>
        )}
        {description && (
          <p id={descId} style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
        <div style={{ marginTop: title || description ? 20 : 0 }}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

// Destructive confirmation. When `confirmPhrase` is set the primary button
// stays locked until the user types it — reserved for irreversible wipes.
export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'danger', confirmPhrase, onConfirm, onCancel, busy = false,
}) {
  const [typed, setTyped] = useState('')

  useEffect(() => { if (open) setTyped('') }, [open])

  const ready = !confirmPhrase || typed.trim().toUpperCase() === confirmPhrase.toUpperCase()

  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} title={title} description={description}>
      {confirmPhrase && (
        <Field
          label={`Type ${confirmPhrase} to confirm`}
          style={{ marginBottom: 18 }}
        >
          <TextInput
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            aria-label={`Type ${confirmPhrase} to confirm`}
          />
        </Field>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
        <Button
          variant={tone === 'danger' ? 'dangerSolid' : 'primary'}
          onClick={onConfirm}
          disabled={!ready}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ── Toasts ───────────────────────────────────────────────────────

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback(id => {
    setToasts(list => list.filter(t => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  // Failures stay until dismissed. A toast is the only place the reason for a
  // failed connect, save or restore is ever shown — losing it after 3 seconds
  // leaves the user with no way to find out what went wrong.
  const toast = useCallback((message, tone = 'success', duration) => {
    const id = Math.random().toString(36).slice(2)
    const ms = duration ?? (tone === 'danger' ? 0 : 3200)
    setToasts(list => [...list, { id, message, tone, persistent: ms === 0 }])
    if (ms > 0) timers.current.set(id, setTimeout(() => dismiss(id), ms))
    return id
  }, [dismiss])

  // Clear any pending timers if the provider unmounts mid-toast.
  useEffect(() => {
    const map = timers.current
    return () => { for (const t of map.values()) clearTimeout(t); map.clear() }
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: 'fixed', bottom: 84, right: 24, zIndex: 500,
            display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          {toasts.map(t => {
            const tone = BADGE_TONES[t.tone] || BADGE_TONES.neutral
            return (
              <div
                key={t.id}
                role={t.tone === 'danger' ? 'alert' : 'status'}
                onClick={t.persistent ? undefined : () => dismiss(t.id)}
                style={{
                  pointerEvents: 'auto', cursor: t.persistent ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  maxWidth: 360, padding: '11px 12px 11px 15px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)', color: 'var(--text-primary)',
                  border: `1px solid ${tone.bd}`, boxShadow: 'var(--shadow-lg)',
                  fontSize: 13.5, fontWeight: 550, lineHeight: 1.45,
                  animation: 'menu-in 0.18s ease-out',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: tone.fg,
                  flexShrink: 0, marginTop: 6,
                }} />
                <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
                {t.persistent && (
                  <button
                    type="button"
                    className="focus-ring"
                    aria-label="Dismiss"
                    onClick={() => dismiss(t.id)}
                    style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-secondary)', background: 'transparent',
                      marginTop: -1,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

// Returns a `toast(message, tone)` function. Safe to call when no provider is
// mounted — it just no-ops rather than throwing inside an event handler.
export function useToast() {
  const ctx = useContext(ToastCtx)
  return ctx?.toast || (() => {})
}
