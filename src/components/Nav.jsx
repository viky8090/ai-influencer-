import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, useAuth } from '@clerk/react'
import { Menu, X, Plus, Settings, Sun, Moon } from 'lucide-react'
import {
  Button,
  IconButton,
  Popover,
  Divider,
  VStack,
} from '@astryxdesign/core'
import { useTheme } from '../context/theme'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'
import ProfileMenu from './ProfileMenu'
import CreditChip from './CreditChip'

// Docs, How it works, and Earn intentionally live in the footer only (Footer.jsx COLUMNS) —
// they're reference/marketing pages, kept out of the header to keep the app nav uncluttered.
const links = [
  { to: '/dashboard', label: 'Home' },
  { to: '/influencers', label: 'Influencers' },
  { to: '/publish', label: 'Publish' },
  { to: '/pricing', label: 'Pricing' },
]

// '/dashboard' is in here because a signed-out visitor was being shown a "Home" link that
// pointed at a dashboard they have no account for. Signed out, the header is now purely
// marketing: Pricing plus the sign-up path.
const SIGNED_IN_LINKS = ['/dashboard', '/influencers', '/publish']

// NOTE: a MARKETING_ROUTES list used to live here and force dark chrome on '/',
// '/how-it-works' and '/earnings'. It's gone: the marketing surface now themes off
// `data-theme` like the rest of the app (see the --m-* tokens in index.css), so pinning the
// nav to dark produced dark chrome sitting on top of a white page in light mode.

function LogoMark({ dark }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, display: 'block' }} aria-hidden="true">
      <rect width="28" height="28" rx="7" fill={dark ? '#151517' : '#FFFFFF'} stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'} />
      <g stroke="#C7F24E" strokeWidth="3.05" strokeLinecap="round">
        <line x1="8.1" y1="7.4" x2="12.9" y2="20.4" />
        <line x1="12.9" y1="7.4" x2="17.7" y2="20.4" />
        <line x1="17.7" y1="7.4" x2="22.5" y2="20.4" />
      </g>
    </svg>
  )
}

export default function Nav() {
  const { pathname } = useLocation()
  const { isDark, toggle } = useTheme()
  const { isSignedIn } = useAuth()
  const dark = isDark

  const visibleLinks = links.filter((l) => !SIGNED_IN_LINKS.includes(l.to) || isSignedIn)

  const [menuOpen, setMenuOpen] = useState(false)
  // First-lifetime visit → "Start for free"; return visits → "Sign up"
  const [isFirstVisit] = useState(() => {
    try {
      const first = !localStorage.getItem('vm_visited')
      if (first) localStorage.setItem('vm_visited', String(Date.now()))
      return first
    } catch {
      return true
    }
  })
  const primaryCta = isFirstVisit ? 'Start for free' : 'Sign up'

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const ink = dark ? '#F4F4F5' : 'var(--text-primary)'
  const muted = dark ? 'rgba(255,255,255,0.52)' : 'var(--text-secondary)'
  const barBg = dark ? 'rgba(10, 10, 11, 0.92)' : 'rgba(244, 244, 245, 0.92)'
  const barBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,11,0.08)'

  const mobileMenu = (
    <VStack gap={0.5} style={{ padding: 4 }}>
      {visibleLinks.map((l) => (
        <Button
          key={l.to}
          label={l.label}
          variant="ghost"
          size="md"
          href={l.to}
          as={RouterLink}
          onClick={() => setMenuOpen(false)}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            fontWeight: pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to)) ? 700 : 500,
            color: pathname === l.to || (l.to !== '/' && pathname.startsWith(l.to))
              ? 'var(--m-brand-text)'
              : undefined,
          }}
        />
      ))}

      {/* Same reasoning as the dashboard link: Settings is an account surface, so offering
          it to someone without an account is a dead end. */}
      <Show when="signed-in">
        <Divider variant="subtle" style={{ margin: '4px 0' }} />
        <Button
          label="Settings"
          variant="ghost"
          size="md"
          href="/settings"
          as={RouterLink}
          icon={<Settings size={18} strokeWidth={1.8} aria-hidden />}
          onClick={() => setMenuOpen(false)}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        />
      </Show>

      <Show when="signed-out">
        <Divider variant="subtle" style={{ margin: '4px 0' }} />
        <SignInButton mode="modal">
          <Button
            label="Log in"
            variant="ghost"
            size="md"
            onClick={() => setMenuOpen(false)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          />
        </SignInButton>
        <SignUpButton mode="modal">
          <Button
            label={primaryCta}
            variant="primary"
            size="md"
            onClick={() => setMenuOpen(false)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </SignUpButton>
      </Show>
    </VStack>
  )

  // Force Astryx dark tokens when the bar is dark (marketing pages) so CTAs match chrome.
  return (
    <AstryxScope mode={dark ? 'dark' : 'light'}>
      <nav
        className="nav-root"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: 'var(--nav-h)',
          background: barBg,
          backdropFilter: dark ? 'blur(12px) saturate(1.2)' : 'blur(10px) saturate(1.1)',
          WebkitBackdropFilter: dark ? 'blur(12px) saturate(1.2)' : 'blur(10px) saturate(1.1)',
          borderBottom: `1px solid ${barBorder}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          zIndex: 100,
          gap: 4,
        }}
      >
        <div style={{
          width: '100%', maxWidth: 1280, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 4, height: '100%',
          position: 'relative',
        }}>

          {/* Logo */}
          {/* Home means "my workspace" once you have one. Signed in, the logo goes to the
              dashboard rather than back out to the marketing pitch. This is a destination
              change, NOT a redirect on '/' - see the note in App.jsx for why. */}
          <NavLink to={isSignedIn ? '/dashboard' : '/'} style={{ marginRight: 12, display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
            <LogoMark dark={dark} />
            <span className="nav-brand-label" style={{
              fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: ink,
            }}>
              vy<span style={{ color: 'var(--m-brand-text)' }}>motion</span>
            </span>
          </NavLink>

          {/* Desktop links — keep NavLink for brand active styles */}
          <div className="nav-links-inline" style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {visibleLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="nav-link"
                style={({ isActive }) => ({
                  padding: '6px 11px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  color: isActive ? 'var(--m-brand-text)' : muted,
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  transition: 'background 0.15s var(--ease-out), color 0.15s var(--ease-out)',
                  textDecoration: 'none',
                })}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
            <Button
              label="Create"
              variant="primary"
              size="sm"
              href="/create"
              as={RouterLink}
              icon={<Plus size={15} strokeWidth={2.4} aria-hidden />}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 8 }}
            >
              <span className="nav-create-label">Create</span>
            </Button>

            {/* Theme toggle. Previously the only way to change theme was Settings, which is
                behind sign-in — so a signed-out visitor on the marketing pages had no way to
                reach light mode at all. `toggle` takes the click point to originate the
                view-transition droplet from the button. */}
            <IconButton
              label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              variant="ghost"
              size="md"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                toggle(r.left + r.width / 2, r.top + r.height / 2)
              }}
              icon={isDark
                ? <Sun size={18} strokeWidth={1.9} aria-hidden />
                : <Moon size={18} strokeWidth={1.9} aria-hidden />}
            />

            <Show when="signed-out">
              <span className="nav-desktop-only" style={{ display: 'flex', alignItems: 'center' }}>
                <SignInButton mode="modal">
                  <Button
                    label="Log in"
                    variant="ghost"
                    size="sm"
                    style={{
                      color: dark ? 'var(--m-brand-text)' : 'var(--text-primary)',
                      fontWeight: 700,
                    }}
                  />
                </SignInButton>
              </span>
              <SignUpButton mode="modal">
                <Button label={primaryCta} variant="primary" size="sm" style={{ borderRadius: 8 }} />
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <span className="nav-desktop-only" style={{ display: 'flex', alignItems: 'center' }}>
                <CreditChip />
              </span>
              <ProfileMenu />
            </Show>

            <span className="nav-hamburger">
              <Popover
                isOpen={menuOpen}
                onOpenChange={setMenuOpen}
                placement="below"
                alignment="end"
                width={260}
                label="Main menu"
                hasAutoFocus={false}
                content={mobileMenu}
              >
                <IconButton
                  label={menuOpen ? 'Close menu' : 'Menu'}
                  variant="ghost"
                  size="md"
                  icon={menuOpen
                    ? <X size={18} strokeWidth={1.9} aria-hidden />
                    : <Menu size={18} strokeWidth={1.9} aria-hidden />}
                />
              </Popover>
            </span>
          </div>
        </div>
      </nav>
    </AstryxScope>
  )
}
