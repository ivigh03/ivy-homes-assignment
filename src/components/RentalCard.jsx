import { formatPrice, formatArea } from '../utils/format'

const FURNISHING_LABEL = {
  'unfurnished': 'Unfurnished',
  'semi-furnished': 'Semi-furnished',
  'fully-furnished': 'Fully furnished',
}

export default function RentalCard({ rental }) {
  const {
    listing_id,
    apartment_name,
    title,
    locality,
    price,
    deposit,
    bedroom,
    bathroom,
    carpet_area,
    furnishing,
    property_type,
    is_verified,
  } = rental

  const displayName = apartment_name || title || '—'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', textTransform: 'capitalize' }}>
            {locality}
          </div>
        </div>
        {is_verified && (
          <span style={{ flexShrink: 0, fontSize: '0.68rem', fontWeight: 600, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '0.15rem 0.45rem' }}>
            Verified
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          {formatPrice(price)}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>/mo</span>
        </div>
        {deposit > 0 && (
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
            Deposit: {formatPrice(deposit)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {bedroom > 0 && <Tag>{bedroom} BHK</Tag>}
        {bathroom > 0 && <Tag>{bathroom} Bath</Tag>}
        {carpet_area > 0 && <Tag>{formatArea(carpet_area)}</Tag>}
        {furnishing && <Tag>{FURNISHING_LABEL[furnishing] ?? furnishing}</Tag>}
        {property_type && <Tag style={{ textTransform: 'capitalize' }}>{property_type}</Tag>}
      </div>
    </div>
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
      ...style,
    }}>
      {children}
    </span>
  )
}
