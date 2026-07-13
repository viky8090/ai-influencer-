// Editorial Studio surface recipes.
// Export names keep `glass*` for backward compatibility with existing pages
// (Influencers.jsx, Create, etc.) — values are solid panels, not frosted glass.

export const glassCard = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
  borderRadius: 'var(--radius-md)',
}

export const glassPanel = {
  ...glassCard,
  borderRadius: 'var(--radius-lg)',
}

export const glassModal = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-lg)',
  borderRadius: 'var(--radius-lg)',
}

export const glassOverlay = {
  background: 'rgba(0, 0, 0, 0.55)',
}

export const glassChip = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 999,
}

export const glassBtnPrimary = {
  background: 'var(--brand)',
  color: 'var(--brand-ink)',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 800,
  cursor: 'pointer',
  transition: 'filter 0.15s var(--ease-out), transform 0.12s var(--ease-out), background 0.15s var(--ease-out)',
}

export const glassBtnGhost = {
  background: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), transform 0.12s var(--ease-out)',
}

export const glassInput = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
}

// ── Interaction helpers ──────────────────────────────────────────────

// No-op tilt — Editorial Studio drops refraction tilt; keeps call-sites safe.
export function tiltHandlers(_maxDeg = 3) {
  return {
    onMouseMove() {},
    onMouseLeave() {},
  }
}

export function pressHandlers(scale = 0.98) {
  return {
    onMouseDown(e) {
      e.currentTarget.style.transform = `scale(${scale})`
      e.currentTarget.style.transition = 'transform 0.1s var(--ease-out)'
    },
    onMouseUp(e) {
      e.currentTarget.style.transform = 'scale(1)'
      e.currentTarget.style.transition = 'transform 0.15s var(--ease-out)'
    },
    onMouseLeave(e) {
      e.currentTarget.style.transform = 'scale(1)'
      e.currentTarget.style.transition = 'transform 0.15s var(--ease-out)'
    },
  }
}
