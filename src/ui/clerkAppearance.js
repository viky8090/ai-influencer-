// Clerk appearance — makes every Clerk surface (sign-in/up modals, UserButton popover) match
// the app's "Liquid Lime Glass" design.
//
// ⚠ Clerk runs color-math (lighten/darken/alpha) on every `variables` color, and that math
// CANNOT parse CSS `var(--…)` strings — they silently fail and fall back to Clerk's defaults
// (e.g. #212126 dark text), which is why the UserButton popover text rendered invisible on the
// dark popover. So `variables` MUST use concrete values. We pin the auth surfaces to the app's
// DARK palette (brand-primary, avoids lime-on-white contrast issues in light mode). `elements`
// CSS is injected as normal stylesheet rules, so those DO honor `var(--…)` and stay theme-safe.
export const clerkAppearance = {
  variables: {
    colorPrimary: '#C7F24E',                    // brand lime
    colorText: '#F4F4F5',                        // --text-primary (dark)
    colorTextSecondary: 'rgba(244,244,245,0.62)',// --text-secondary (dark)
    colorBackground: '#101019',                  // deep aurora-glass base
    colorInputBackground: 'rgba(255,255,255,0.06)',
    colorInputText: '#F4F4F5',
    colorNeutral: '#FFFFFF',                     // Clerk derives borders/dividers/icons from this
    colorDanger: '#FF3D8B',
    borderRadius: '14px',                        // --radius-md
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  },
  elements: {
    // Modal / popover shell — glassy border + deep shadow, matching glassModal.
    card: {
      background: '#101019',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.55)',
      borderRadius: '20px',
    },
    headerTitle: { color: '#F4F4F5' },
    headerSubtitle: { color: 'rgba(244,244,245,0.62)' },
    // Primary CTA — lime with lime bloom, ink text (matches glassBtnPrimary).
    formButtonPrimary: {
      background: '#C7F24E',
      color: '#0A0A0B',
      border: '1px solid rgba(255,255,255,0.35)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55), 0 0 24px rgba(199,242,78,0.35)',
      borderRadius: '999px',
      fontWeight: 800,
      textTransform: 'none',
      '&:hover': { background: '#D4F76B' },
    },
    socialButtonsBlockButton: {
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.06)',
      color: '#F4F4F5',
    },
    socialButtonsBlockButtonText: { color: '#F4F4F5' },
    dividerLine: { background: 'rgba(255,255,255,0.10)' },
    dividerText: { color: 'rgba(244,244,245,0.62)' },
    formFieldLabel: { color: '#F4F4F5' },
    formFieldInput: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.10)',
      color: '#F4F4F5',
    },
    footerActionText: { color: 'rgba(244,244,245,0.62)' },
    footerActionLink: { color: '#C7F24E' },

    // ── UserButton popover (the dropdown from the avatar) — this is what rendered invisible.
    userButtonPopoverCard: {
      background: '#101019',
      border: '1px solid rgba(255,255,255,0.10)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 24px 64px rgba(0,0,0,0.55)',
      borderRadius: '18px',
    },
    userPreviewMainIdentifier: { color: '#F4F4F5' },
    userPreviewSecondaryIdentifier: { color: 'rgba(244,244,245,0.62)' },
    userButtonPopoverActionButton: {
      color: '#F4F4F5',
      '&:hover': { background: 'rgba(255,255,255,0.06)' },
    },
    userButtonPopoverActionButtonText: { color: '#F4F4F5' },
    userButtonPopoverActionButtonIcon: { color: 'rgba(244,244,245,0.62)' },
    userButtonPopoverFooter: { display: 'none' },
  },
}
