import { NavLink, useLocation } from 'react-router-dom'

/**
 * Segmented nav where the active item morphs out of a joined bar.
 *
 * The effect: every item shares one fill, so at rest they read as a single continuous
 * bar. The active item gains horizontal margin - opening a real gap on both sides - and
 * rounds all four corners, so it appears to detach and lift out of the track. Its
 * neighbours round the corner facing the gap so the seam stays clean. Animating margin
 * and border-radius together is what produces the morph.
 *
 * Ported from a Tailwind/Next reference. This project has neither Tailwind nor clsx, so
 * the utility classes are expressed as inline styles on theme tokens instead - which also
 * makes it work in both themes rather than the reference's hardcoded black/white inversion.
 */

const RADIUS = 10
const GAP = 5          // horizontal margin the active item opens up
const DURATION = '0.3s'
const EASE = 'var(--ease-out)'

export function MorphicNavbar({ items = {}, style }) {
  const { pathname } = useLocation()

  const isActiveLink = (path) => {
    if (!path) return false
    // '/' would prefix-match every route, so it has to be exact.
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const entries = Object.entries(items)
  // A single segment has nothing to morph against - render nothing rather than a
  // one-item "segmented" control, which just reads as a stray button.
  if (entries.length < 2) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {entries.map(([path, { name }], i, arr) => {
          const active = isActiveLink(path)
          const first = i === 0
          const last = i === arr.length - 1
          const prevActive = i > 0 && isActiveLink(arr[i - 1][0])
          const nextActive = i < arr.length - 1 && isActiveLink(arr[i + 1][0])

          // Round the outer ends of the bar, plus any edge that faces the gap the
          // active item opened.
          const left = active || first || prevActive ? RADIUS : 0
          const right = active || last || nextActive ? RADIUS : 0

          return (
            <NavLink
              key={path}
              to={path}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 14px',
                fontSize: 13.5,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                background: 'var(--bg-tertiary)',
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: active ? 700 : 500,
                margin: active ? `0 ${GAP}px` : '0',
                borderTopLeftRadius: left,
                borderBottomLeftRadius: left,
                borderTopRightRadius: right,
                borderBottomRightRadius: right,
                transition: [
                  `margin ${DURATION} ${EASE}`,
                  `border-radius ${DURATION} ${EASE}`,
                  `color ${DURATION} ${EASE}`,
                  `background-color ${DURATION} ${EASE}`,
                ].join(', '),
              }}
            >
              {name}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

export default MorphicNavbar
