import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ListingsPage from './pages/ListingsPage'
import ListingDetailPage from './pages/ListingDetailPage'
import RentalsPage from './pages/RentalsPage'
import ProjectsPage from './pages/ProjectsPage'
import FavouritesPage from './pages/FavouritesPage'
import InsightsPage from './pages/InsightsPage'

function ProtectedLayout({ children }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/listings" replace />} />
        <Route path="/listings" element={<ProtectedLayout><ListingsPage /></ProtectedLayout>} />
        <Route path="/listings/:id" element={<ProtectedLayout><ListingDetailPage /></ProtectedLayout>} />
        <Route path="/rentals" element={<ProtectedLayout><RentalsPage /></ProtectedLayout>} />
        <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
        <Route path="/favourites" element={<ProtectedLayout><FavouritesPage /></ProtectedLayout>} />
        <Route path="/insights" element={<ProtectedLayout><InsightsPage /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
