import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getListing } from '../api/listings'
import { formatPrice, formatArea, capitalize } from '../utils/format'
import { useFavourites } from '../hooks/useFavourites'

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ minWidth: 160, fontSize: '0.85rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.85rem' }}>{value}</span>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const { isSaved, toggle } = useFavourites()
  const saved = isSaved(id)

  const { data: listing, isLoading, isError, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  })

  if (isLoading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 6, marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 'var(--radius)' }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        <Link to="/listings" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>← Back to listings</Link>
        <p style={{ marginTop: '2rem', color: 'var(--color-error)' }}>
          {error?.response?.data?.detail || 'Could not load this listing.'}
        </p>
      </div>
    )
  }

  const l = listing

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to="/listings" style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>← Back to listings</Link>
        <button
          onClick={() => toggle(id)}
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.85rem',
            background: saved ? '#fef2f2' : 'var(--color-surface)',
            border: `1px solid ${saved ? '#fca5a5' : 'var(--color-border)'}`,
            borderRadius: 6,
            color: saved ? '#dc2626' : 'var(--color-text)',
            fontWeight: 500,
          }}
        >
          {saved ? '♥ Saved' : '♡ Save listing'}
        </button>
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>{l.apartment_name || '—'}</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{l.locality}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatPrice(l.price)}</div>
            {l.carpet_area > 0 && l.price > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                ₹{Math.round(l.price / l.carpet_area).toLocaleString('en-IN')}/sqft
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {l.bedroom > 0 && <Chip>{l.bedroom} BHK</Chip>}
          {l.bathroom > 0 && <Chip>{l.bathroom} Bath</Chip>}
          {l.balcony > 0 && <Chip>{l.balcony} Balcony</Chip>}
          {l.carpet_area > 0 && <Chip>{formatArea(l.carpet_area)} carpet</Chip>}
          {l.super_built_up_area > 0 && <Chip>{formatArea(l.super_built_up_area)} SBA</Chip>}
          {l.furnishing && <Chip style={{ textTransform: 'capitalize' }}>{l.furnishing}</Chip>}
          {l.property_type && <Chip style={{ textTransform: 'capitalize' }}>{l.property_type}</Chip>}
          {l.is_verified && (
            <Chip style={{ background: '#dcfce7', color: '#15803d', border: 'none' }}>✓ Verified</Chip>
          )}
        </div>

        {l.description && (
          <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--color-text)', background: 'var(--color-bg)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem' }}>
            {l.description}
          </p>
        )}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Property details</h2>
        <Row label="Property type" value={capitalize(l.property_type)} />
        <Row label="Floor" value={l.total_floors > 0 ? `${l.floor} of ${l.total_floors}` : l.floor > 0 ? l.floor : null} />
        <Row label="Facing" value={capitalize(l.facing_direction)} />
        <Row label="Covered parking" value={l.covered_parking > 0 ? l.covered_parking : null} />
        <Row label="Website" value={l.website} />
        <Row label="Posted at" value={l.posted_at ? l.posted_at.replace('T', ' ') : null} />
        <Row label="Listing ID" value={l.listing_id} />
        {l.project_id && <Row label="Project ID" value={l.project_id} />}
      </div>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contact</h2>
        <Row label="Posted by" value={capitalize(l.posted_by)} />
        <Row label="Name" value={l.posted_by_name} />
        <Row label="Contact" value={l.posted_by_contact} />
        {l.listing_url && (
          <div style={{ marginTop: '0.75rem' }}>
            <a
              href={l.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}
            >
              View original listing ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ children, style }) {
  return (
    <span style={{
      fontSize: '0.78rem',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      padding: '0.2rem 0.6rem',
      ...style,
    }}>
      {children}
    </span>
  )
}
