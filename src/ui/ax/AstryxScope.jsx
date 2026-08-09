import { Theme } from '@astryxdesign/core/theme'
import { LinkProvider } from '@astryxdesign/core/Link'
import { useTheme as useVymotionTheme } from '../../context/theme'
import { vymotionTheme } from './vymotionTheme'
import RouterLink from './RouterLink'

/**
 * Astryx scope for Vymotion.
 *
 * Prefer the root provider in App.jsx. Use this when you need:
 * - a forced mode (e.g. marketing Footer always dark), or
 * - isolation outside the main tree (rare).
 *
 * Nested Theme skips html data-theme sync — safe with the root provider.
 */
export default function AstryxScope({ children, mode: modeOverride }) {
  const { isDark } = useVymotionTheme()
  const mode = modeOverride || (isDark ? 'dark' : 'light')

  // When no mode override, root App provider already supplies Theme + LinkProvider.
  if (!modeOverride) {
    return children
  }

  return (
    <Theme theme={vymotionTheme} mode={mode}>
      <LinkProvider component={RouterLink}>
        {children}
      </LinkProvider>
    </Theme>
  )
}

/** App-root provider — one Theme for the whole SPA. */
export function AstryxProvider({ children }) {
  const { isDark } = useVymotionTheme()
  const mode = isDark ? 'dark' : 'light'

  return (
    <Theme theme={vymotionTheme} mode={mode}>
      <LinkProvider component={RouterLink}>
        {children}
      </LinkProvider>
    </Theme>
  )
}
