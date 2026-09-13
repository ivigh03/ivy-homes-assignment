import { useParams } from 'react-router-dom'

export default function ListingDetailPage() {
  const { id } = useParams()
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Listing Detail</h2>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Detail for {id}</p>
    </div>
  )
}
