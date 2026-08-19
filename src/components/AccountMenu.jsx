import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useProfile } from '../store'
import { isHFConnected } from '../utils/higgsfieldAuth'
import { Avatar } from './ui'
import {
  IconUser, IconSettings, IconShield, IconUsers, IconChevronDown, IconPlug,
} from './icons'

/*
 * The account dropdown in the nav bar: the one place a user goes to find
 * themselves, their settings, and everything account-shaped.
 */

const ITEMS = [
  { to: '/profile',   label: 'View profile',   Icon: IconUser,     description: 'Your roster and stats' },
  { to: '/settings',  label: 'Settings',       Icon: IconSettings, description: 'Appearance, connections, defaults' },
  { to: '/account',   label: 'Manage account', Icon: IconShield,   description: 'Data, backups, storage' },
  { to: '/community', label: 'Join community', Icon: IconUsers,    description: 'Help, feedback, guides' },
]

export default function AccountMenu({ dark }) {
  const [open, setOpen] = useState(false)
  const [hfConnected, setHfConnected] = useState(false)
  const { profile } = useProfile()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])

  const displayName = profile.displayName?.trim() || 'Your studio'
  const handle = profile.handle?.trim()

  // Read the connection flag when the menu opens rather than on every render —
  // it lives in localStorage and can change from the Settings page or a popup.
  useEffect(() => {
    if (open) setHfConnected(isHFConnected())
  }, [open])

  const close = useCallback((refocus = false) => {
    setOpen(false)
    // Drop refs to the unmounted items so arrow-key nav never walks a
    // detached node on the next open.
    itemRefs.current = []
    if (refocus) triggerRef.current?.focus()
  }, [])

  // Close whenever the route changes — otherwise the menu hangs over the page
  // you just navigated to.
  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
      e.preventDefault()
      const items = itemRefs.current.filter(Boolean)
      if (!items.length) return
      const current = items.indexOf(document.activeElement)
      let next
      if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = items.length - 1
      else if (e.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length
      else next = current <= 0 ? items.length - 1 : current - 1
      items[next].focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  function openWithFirstItem() {
    setOpen(true)
    // Wait for the popover to mount before moving focus into it.
    requestAnimationFrame(() => itemRefs.current[0]?.focus())
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        className="focus-ring"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${displayName}`}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openWithFirstItem() }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 40, padding: '0 8px 0 4px', borderRadius: 999,
          background: open ? (dark ? 'rgba(255,255,255,0.12)' : 'var(--bg-tertiary)') : 'transparent',
          color: dark ? 'rgba(255,255,255,0.65)' : 'var(--text-secondary)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.10)' : 'var(--bg-tertiary)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <Avatar src={profile.avatar} name={displayName} size={32} />
        <IconChevronDown
          size={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 268, padding: 8, zIndex: 300,
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-lg)',
            animation: 'menu-in 0.14s ease-out',
          }}
        >
          {/* Identity header — doubles as a shortcut to the profile page. */}
          <Link
            to="/profile"
            role="menuitem"
            ref={el => { itemRefs.current[0] = el }}
            className="menu-item"
            style={{ padding: '10px 12px', marginBottom: 4, alignItems: 'center' }}
            onClick={() => setOpen(false)}
          >
            <Avatar src={profile.avatar} name={displayName} size={38} />
            <span style={{ minWidth: 0, display: 'block' }}>
              <span style={{
                display: 'block', fontSize: 14, fontWeight: 650,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{displayName}</span>
              <span style={{
                display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{handle ? `@${handle}` : 'Saved on this device'}</span>
            </span>
          </Link>

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 6px 6px' }} />

          {ITEMS.map(({ to, label, Icon }, i) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              ref={el => { itemRefs.current[i + 1] = el }}
              className="menu-item"
              style={pathname === to ? { background: 'var(--surface-hover)', fontWeight: 650 } : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}

          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 6px 4px' }} />

          {/* Connection state is the single most useful thing to surface here:
              nothing generates until Higgsfield is connected. */}
          <button
            type="button"
            role="menuitem"
            ref={el => { itemRefs.current[ITEMS.length + 1] = el }}
            className="menu-item"
            onClick={() => { setOpen(false); navigate('/settings#connections') }}
            style={{ fontSize: 13 }}
          >
            <IconPlug size={17} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
              Higgsfield
              <span style={{
                marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600,
                color: hfConnected ? '#34C759' : 'var(--text-tertiary)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: hfConnected ? '#34C759' : 'var(--text-tertiary)',
                }} />
                {hfConnected ? 'Connected' : 'Not connected'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
