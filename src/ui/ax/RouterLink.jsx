import { forwardRef } from 'react'
import { Link as RRLink } from 'react-router-dom'

/**
 * React Router adapter for Astryx Link / Button `as` + LinkProvider.
 * Astryx passes `href`; RR wants `to`.
 */
const RouterLink = forwardRef(function RouterLink(
  { href, to, children, ...rest },
  ref,
) {
  return (
    <RRLink ref={ref} to={to ?? href ?? '/'} {...rest}>
      {children}
    </RRLink>
  )
})

export default RouterLink
