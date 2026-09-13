import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getListing } from '../api/listings'
import { useFavourites } from '../hooks/useFavourites'
import ListingCard from '../components/ListingCard'

export default function FavouritesPage() {
  const { ids, remove } = useFavourites()
  const savedIds = [...ids]

  // Fetch each saved listing individually (typically a small set)
  const queries = useQueries({
    queries: savedIds.map(id => ({
      queryKey: ['listing', id],
      queryFn: () => getListing(id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const loaded = queries.filter(q => q.status === 'success')
  const loading = queries.some(q => q.isPending)

  if (savedIds.length === 0) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Saved listings</h1>
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>No saved listings yet</p>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Open a listing and click "Save listing" to keep it here.
          </p>
          <Link to="/listings" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            Browse listings →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Saved listings</h1>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{savedIds.length} saved</span>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {savedIds.map(id => <div key={id} className="skeleton" style={{ height: 148, borderRadius: 'var(--radius)' }} />)}
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {queries.map((q, i) => {
            const id = savedIds[i]
            if (q.isPending) return <div key={id} className="skeleton" style={{ height: 148, borderRadius: 'var(--radius)' }} />
            if (q.isError) {
              return (
                <div key={id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-error)' }}>Could not load listing {id}</p>
                  <button onClick={() => remove(id)} style={{ fontSize: '0.78rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
                    Remove from saved
                  </button>
                </div>
              )
            }
            return (
              <div key={id} style={{ position: 'relative' }}>
                <ListingCard listing={q.data} />
                <button
                  onClick={() => remove(id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: '0.72rem',
                    background: '#fff',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    padding: '0.2rem 0.5rem',
                    color: 'var(--color-error)',
                    cursor: 'pointer',
                    zIndex: 1,
                  }}
                  title="Remove from saved"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
