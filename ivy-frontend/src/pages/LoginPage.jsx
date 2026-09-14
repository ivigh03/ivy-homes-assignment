import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ivyLogo from '../assets/ivy.jpg'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/listings'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, background: 'var(--color-surface)', borderRadius: 'var(--radius)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <img src={ivyLogo} alt="Ivy Homes" style={{ height: 110, objectFit: 'contain', mixBlendMode: 'multiply' }} />
        </div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>Sign in to continue</p>

        {error && (
          <p style={{ color: 'var(--color-error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
        )}

        <label style={{ display: 'block', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="demo1@ivy.homes"
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6 }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 6 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.625rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.95rem' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
