import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ivy_token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ivy_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    // Store both access and refresh tokens
    localStorage.setItem('ivy_token', data.access_token)
    localStorage.setItem('ivy_refresh_token', data.refresh_token)
    localStorage.setItem('ivy_user', JSON.stringify(data.user))
    setToken(data.access_token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // clear local state regardless of server response
    }
    localStorage.removeItem('ivy_token')
    localStorage.removeItem('ivy_refresh_token')
    localStorage.removeItem('ivy_user')
    setToken(null)
    setUser(null)
  }, [])

  // When the token refresh fails (15-min expiry), clear React state so
  // RequireAuth redirects to /login instead of showing a broken page.
  useEffect(() => {
    function handleExpired() {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('ivy:auth:expired', handleExpired)
    return () => window.removeEventListener('ivy:auth:expired', handleExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
