import { formatProjectPrice } from '../utils/format'

const STATUS_STYLE = {
  'under construction': { bg: '#fef3c7', color: '#92400e' },
  'ready to move': { bg: '#dcfce7', color: '#15803d' },
  'launched': { bg: '#dbeafe', color: '#1e40af' },
  'completed': { bg: '#f3f4f6', color: '#374151' },
}

export default function ProjectCard({ project }) {
  const {
    project_id,
    apartment_name,
    developer_name,
    locality,
    project_status,
    price_min,
    price_max,
    total_units,
    total_listings,
    possession_date,
    rera_number,
    amenities,
  } = project

  const statusStyle = STATUS_STYLE[project_status] || { bg: '#f3f4f6', color: '#374151' }

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
            {apartment_name || '—'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', textTransform: 'capitalize' }}>
            {developer_name} · {locality}
          </div>
        </div>
        {project_status && (
          <span style={{
            flexShrink: 0,
            fontSize: '0.68rem',
            fontWeight: 600,
            background: statusStyle.bg,
            color: statusStyle.color,
            borderRadius: 4,
            padding: '0.15rem 0.45rem',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
          }}>
            {project_status}
          </span>
        )}
      </div>

      {(price_min > 0 || price_max > 0) && (
        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          {formatProjectPrice(price_min)} – {formatProjectPrice(price_max)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {total_units > 0 && <Tag>{total_units.toLocaleString('en-IN')} units</Tag>}
        {total_listings > 0 && <Tag>{total_listings} listings</Tag>}
        {possession_date && (
          <Tag>Possession: {new Date(possession_date).getFullYear()}</Tag>
        )}
        {rera_number && <Tag>RERA</Tag>}
      </div>

      {amenities && amenities.length > 0 && (
        <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>
          {amenities.slice(0, 4).map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(' · ')}
          {amenities.length > 4 && ` +${amenities.length - 4} more`}
        </div>
      )}
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      fontSize: '0.73rem',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      padding: '0.15rem 0.5rem',
    }}>
      {children}
    </span>
  )
}
