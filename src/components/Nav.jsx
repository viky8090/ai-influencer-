import { NavLink, useLocation } from 'react-router-dom'

const links = [
  { to: '/influencers', label: 'Influencers' },
  { to: '/inspiration', label: 'Inspiration' },
  { to: '/brand-deals', label: 'Brand Deals' },
]

export default function Nav() {
  const { pathname } = useLocation()
  const dark = pathname === '/'

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'var(--nav-h)',
      background: dark ? 'transparent' : 'rgba(255,255,255,0.72)',
      backdropFilter: dark ? 'none' : 'blur(24px) saturate(1.8)',
      WebkitBackdropFilter: dark ? 'none' : 'blur(24px) saturate(1.8)',
      borderBottom: dark ? 'none' : '1px solid rgba(0,0,0,0.07)',
      boxShadow: dark ? 'none' : '0 1px 0 rgba(255,255,255,0.5) inset',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      zIndex: 100,
      gap: 8,
      transition: 'background 0.5s, border-color 0.5s',
    }}>
      <NavLink to="/" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 26, height: 26, borderRadius: 7,
          background: dark ? 'rgba(255,255,255,0.10)' : 'var(--text-primary)',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.5s',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="5" r="3" fill="white" opacity="0.9"/>
            <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/>
          </svg>
        </span>
        <span style={{
          fontWeight: 600, fontSize: 15, letterSpacing: '-0.3px',
          color: dark ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)',
          transition: 'color 0.5s',
        }}>Influencer Studio</span>
      </NavLink>

      {links.map(l => (
        <NavLink key={l.to} to={l.to} style={({ isActive }) => ({
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          color: dark
            ? (isActive ? '#fff' : 'rgba(255,255,255,0.42)')
            : (isActive ? 'var(--accent)' : 'var(--text-secondary)'),
          background: dark
            ? (isActive ? 'rgba(255,255,255,0.08)' : 'transparent')
            : (isActive ? 'var(--accent-light)' : 'transparent'),
          transition: 'all 0.15s',
        })}>
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
