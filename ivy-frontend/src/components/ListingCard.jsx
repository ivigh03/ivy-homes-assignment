import { Link } from 'react-router-dom'

function formatPrice(price) {
  if (price == null) return '—'
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`
  if (price >= 100_000) return `₹${(price / 100_000).toFixed(2)} L`
  return `₹${price.toLocaleString('en-IN')}`
}

const FURNISHING_LABEL = {
  'unfurnished': 'Unfurnished',
  'semi-furnished': 'Semi-furnished',
  'fully-furnished': 'Fully furnished',
}

export default function ListingCard({ listing }) {
  const {
    listing_id,
    apartment_name,
    locality,
    price,
    bedroom,
    bathroom,
    carpet_area,
    furnishing,
    is_verified,
    property_type,
  } = listing

  return (
    <Link
      to={`/listings/${listing_id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
        color: 'inherit',
        textDecoration: 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = '#c3cfe0'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '0.92rem',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {apartment_name || '—'}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.15rem',
            textTransform: 'capitalize',
          }}>
            {locality}
          </div>
        </div>
        {is_verified && (
          <span style={{
            flexShrink: 0,
            fontSize: '0.68rem',
            fontWeight: 600,
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: 4,
            padding: '0.15rem 0.45rem',
            letterSpacing: '0.02em',
          }}>
            Verified
          </span>
        )}
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
        {formatPrice(price)}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {bedroom > 0 && <Tag>{bedroom} BHK</Tag>}
        {bathroom > 0 && <Tag>{bathroom} Bath</Tag>}
        {carpet_area > 0 && <Tag>{carpet_area.toLocaleString('en-IN')} sqft</Tag>}
        {furnishing && <Tag>{FURNISHING_LABEL[furnishing] ?? furnishing}</Tag>}
        {property_type && (
          <Tag style={{ textTransform: 'capitalize', color: 'var(--color-text-muted)' }}>
            {property_type}
          </Tag>
        )}
      </div>
    </Link>
  )
}

function Tag({ children, style }) {
  return (
    <span style={{
      fontSize: '0.73rem',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      padding: '0.15rem 0.5rem',
      color: 'var(--color-text)',
      ...style,
    }}>
      {children}
    </span>
  )
}
