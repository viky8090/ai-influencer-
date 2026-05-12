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
    <nav className="nav-root" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 'var(--nav-h)',
      background: dark ? 'transparent' : 'rgba(255,255,255,0.80)',
      backdropFilter: dark ? 'none' : 'blur(24px) saturate(1.8)',
      WebkitBackdropFilter: dark ? 'none' : 'blur(24px) saturate(1.8)',
      borderBottom: dark ? 'none' : '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      zIndex: 100,
      gap: 2,
      transition: 'background 0.5s',
    }}>

      {/* Logo */}
      <NavLink to="/" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: dark ? 'rgba(255,255,255,0.10)' : 'linear-gradient(135deg,#EC4899,#8B5CF6)',
          border: dark ? '1px solid rgba(255,255,255,0.12)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: dark ? 'none' : '0 2px 8px rgba(139,92,246,0.35)',
          transition: 'background 0.5s',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="5" r="3" fill="white" opacity="0.95"/>
            <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.95"/>
          </svg>
        </span>
        <span className="nav-brand-label" style={{
          fontWeight: 700, fontSize: 15, letterSpacing: '-0.4px',
          color: dark ? 'rgba(255,255,255,0.90)' : 'var(--text-primary)',
          transition: 'color 0.5s',
        }}>Influencer Studio</span>
      </NavLink>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className="nav-link" style={({ isActive }) => ({
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: isActive ? 600 : 500,
            color: dark
              ? (isActive ? '#fff' : 'rgba(255,255,255,0.45)')
              : (isActive ? '#EC4899' : 'var(--text-secondary)'),
            background: dark
              ? (isActive ? 'rgba(255,255,255,0.08)' : 'transparent')
              : (isActive ? 'rgba(236,72,153,0.08)' : 'transparent'),
            transition: 'all 0.15s',
          })}>
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
