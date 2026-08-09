import { defineTheme } from '@astryxdesign/core/theme'
import { neutralIconRegistry } from '@astryxdesign/theme-neutral/built'

/**
 * Vymotion "Editorial Studio" Astryx theme.
 * Maps design-system tokens to the same palette as index.css so Astryx
 * components feel native (lime brand, solid panels, near-black dark).
 */
export const vymotionTheme = defineTheme({
  name: 'vymotion',
  icons: neutralIconRegistry,
  tokens: {
    // Brand — always lime CTAs with black ink (matches glassBtnPrimary)
    '--color-accent': ['#C7F24E', '#C7F24E'],
    '--color-accent-muted': ['rgba(199, 242, 78, 0.22)', 'rgba(199, 242, 78, 0.12)'],
    '--color-on-accent': ['#0A0A0B', '#0A0A0B'],
    '--color-text-accent': ['#18181B', '#C7F24E'],
    '--color-icon-accent': ['#18181B', '#C7F24E'],

    // Surfaces
    '--color-background-body': ['#F4F4F5', '#0A0A0B'],
    '--color-background-surface': ['#FFFFFF', '#151517'],
    '--color-background-card': ['#FFFFFF', '#151517'],
    '--color-background-popover': ['#FFFFFF', '#151517'],
    '--color-background-muted': ['#ECECEE', '#1C1C1F'],
    '--color-background-inverted': ['#0A0A0B', '#F4F4F5'],
    '--color-neutral': ['rgba(10, 10, 11, 0.08)', 'rgba(255, 255, 255, 0.10)'],

    // Text
    '--color-text-primary': ['#0A0A0B', '#F4F4F5'],
    '--color-text-secondary': ['rgba(10, 10, 11, 0.58)', 'rgba(255, 255, 255, 0.58)'],
    '--color-text-disabled': ['rgba(10, 10, 11, 0.40)', 'rgba(255, 255, 255, 0.40)'],
    '--color-icon-primary': ['#0A0A0B', '#F4F4F5'],
    '--color-icon-secondary': ['rgba(10, 10, 11, 0.58)', 'rgba(255, 255, 255, 0.58)'],
    '--color-icon-disabled': ['rgba(10, 10, 11, 0.40)', 'rgba(255, 255, 255, 0.40)'],

    // Borders & overlays
    '--color-border': ['rgba(10, 10, 11, 0.10)', 'rgba(255, 255, 255, 0.10)'],
    '--color-border-emphasized': ['rgba(10, 10, 11, 0.16)', 'rgba(255, 255, 255, 0.16)'],
    '--color-overlay': ['rgba(10, 10, 11, 0.45)', 'rgba(0, 0, 0, 0.55)'],
    '--color-overlay-hover': ['rgba(10, 10, 11, 0.04)', 'rgba(255, 255, 255, 0.05)'],
    '--color-overlay-pressed': ['rgba(10, 10, 11, 0.08)', 'rgba(255, 255, 255, 0.08)'],
    '--color-shadow': ['rgba(10, 10, 11, 0.08)', 'rgba(0, 0, 0, 0.40)'],
    '--color-track': ['#ECECEE', '#1C1C1F'],
    '--color-skeleton': ['#ECECEE', '#1C1C1F'],

    // Status — pink accent-2 for error/hot, lime-adjacent success
    '--color-error': ['#E11D48', '#FF3D8B'],
    '--color-error-muted': ['rgba(225, 29, 72, 0.12)', 'rgba(255, 61, 139, 0.14)'],
    '--color-on-error': ['#FFFFFF', '#FFFFFF'],
    '--color-success': ['#15803D', '#C7F24E'],
    '--color-success-muted': ['rgba(21, 128, 61, 0.12)', 'rgba(199, 242, 78, 0.14)'],
    '--color-on-success': ['#FFFFFF', '#0A0A0B'],
    '--color-warning': ['#CA8A04', '#F2C00B'],
    '--color-on-warning': ['#0A0A0B', '#0A0A0B'],

    // Yellow chip (credit token) — brand lime family
    '--color-background-yellow': ['rgba(199, 242, 78, 0.22)', 'rgba(199, 242, 78, 0.14)'],
    '--color-border-yellow': ['rgba(199, 242, 78, 0.55)', 'rgba(199, 242, 78, 0.45)'],
    '--color-icon-yellow': ['#18181B', '#C7F24E'],
    '--color-text-yellow': ['#18181B', '#C7F24E'],

    // Pink (marketing / best-value accents)
    '--color-background-pink': ['rgba(255, 61, 139, 0.12)', 'rgba(255, 61, 139, 0.14)'],
    '--color-border-pink': ['#FF3D8B', '#FF3D8B'],
    '--color-icon-pink': ['#E11D48', '#FF3D8B'],
    '--color-text-pink': ['#9F1239', '#FF3D8B'],

    // Green success badges → brand lime in dark
    '--color-background-green': ['rgba(199, 242, 78, 0.20)', 'rgba(199, 242, 78, 0.14)'],
    '--color-border-green': ['#C7F24E', '#C7F24E'],
    '--color-icon-green': ['#15803D', '#C7F24E'],
    '--color-text-green': ['#14532D', '#C7F24E'],

    // Radius — Editorial Studio
    '--radius-inner': '6px',
    '--radius-element': '8px',
    '--radius-container': '10px',
    '--radius-page': '12px',
    '--radius-chat': '16px',

    // Typography
    '--font-family-body': "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif",
    '--font-family-heading': "Inter, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', system-ui, sans-serif",
    '--font-weight-bold': '700',
    '--font-weight-semibold': '600',
  },
  components: {
    button: {
      base: {
        fontWeight: '700',
        borderRadius: '8px',
        letterSpacing: '-0.1px',
      },
      'variant:primary': {
        fontWeight: '800',
        boxShadow: 'none',
      },
      'variant:secondary': {
        fontWeight: '600',
      },
    },
    card: {
      base: {
        borderRadius: '10px',
        boxShadow: '0 1px 2px rgba(10, 10, 11, 0.05)',
      },
    },
    dialog: {
      base: {
        borderRadius: '12px',
      },
    },
    token: {
      base: {
        fontWeight: '800',
        borderRadius: '8px',
      },
    },
    badge: {
      base: {
        fontWeight: '800',
        letterSpacing: '0.3px',
      },
    },
  },
})
