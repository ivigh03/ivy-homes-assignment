import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ivyLogo from '../assets/ivy.jpg'

const NAV = [
  { to: '/listings', label: 'Listings' },
  { to: '/rentals', label: 'Rentals' },
  { to: '/projects', label: 'Projects' },
  { to: '/favourites', label: 'Saved' },
  { to: '/insights', label: 'Insights' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', height: 56 }}>
        <img src={ivyLogo} alt="Ivy Homes" style={{ height: 60, objectFit: 'contain', mixBlendMode: 'multiply' }} />
        <nav style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                fontSize: '0.9rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                padding: '0.25rem 0',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{user.email}</span>}
          <button onClick={handleLogout} style={{ fontSize: '0.85rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.3rem 0.75rem' }}>
            Sign out
          </button>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
