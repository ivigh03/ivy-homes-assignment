import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

// Known localities in this city (discovered via Phase 3 data extraction)
const LOCALITIES = [
  'dwarka expressway',
  'sector 82',
  'new gurgaon',
  'golf course road',
  'mg road',
  'dlf phase 3',
  'sector 65',
  'sector 56',
  'sector 49',
  'sohna road',
]

async function fetchHealth() {
  const { data } = await apiClient.get('/health', { transformRequest: [(d, h) => { delete h.Authorization; return d }] })
  return data
}
// Health is unauthenticated — use a plain axios call without the auth header
async function getHealth() {
  const { data } = await apiClient.get('/health')
  return data
}

async function getListingsSummary() {
  const { data } = await apiClient.get('/v1/listings', { params: { limit: 1, offset: 0 } })
  return data
}

async function getRentalsSummary() {
  const { data } = await apiClient.get('/v1/rentals', { params: { limit: 1, offset: 0 } })
  return data
}

async function getProjectsSummary() {
  const { data } = await apiClient.get('/v1/projects', { params: { limit: 1, offset: 0 } })
  return data
}

async function getLocalityCount(locality) {
  const { data } = await apiClient.get('/v1/listings', { params: { limit: 1, locality } })
  return { locality, total: data.total }
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      padding: '1.25rem',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

function FindingCard({ title, category, body }) {
  const catColors = {
    auth: '#dbeafe',
    pagination: '#fef3c7',
    sorting: '#fce7f3',
    missing_endpoint: '#fee2e2',
    units: '#ede9fe',
    data_quality: '#fef9c3',
    completeness: '#dcfce7',
    filters: '#e0f2fe',
    timestamps: '#ffedd5',
    duplicates: '#f3f4f6',
  }
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      padding: '1rem',
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</span>
        <span style={{
          fontSize: '0.65rem',
          background: catColors[category] || '#f3f4f6',
          color: '#374151',
          borderRadius: 4,
          padding: '0.1rem 0.4rem',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}>
          {category}
        </span>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{body}</p>
    </div>
  )
}

export default function InsightsPage() {
  const healthQ = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: false })
  const listQ = useQuery({ queryKey: ['insights-listings'], queryFn: getListingsSummary })
  const rentQ = useQuery({ queryKey: ['insights-rentals'], queryFn: getRentalsSummary })
  const projQ = useQuery({ queryKey: ['insights-projects'], queryFn: getProjectsSummary })

  // Fetch per-locality listing counts
  const localityQueries = useQuery({
    queryKey: ['insights-localities'],
    queryFn: () => Promise.all(LOCALITIES.map(getLocalityCount)),
    staleTime: 5 * 60_000,
  })

  const localityRows = localityQueries.data
    ? [...localityQueries.data].sort((a, b) => b.total - a.total)
    : []

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Insights</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Live data from the API · Discoveries from our audit
        </p>
        {healthQ.data && (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Server: {healthQ.data.status} · {healthQ.data.server_time}
          </p>
        )}
      </div>

      {/* ── Overview stats ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Dataset overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        <StatCard
          label="Total listings"
          value={listQ.data ? listQ.data.total.toLocaleString('en-IN') : '—'}
          sub="Per API · actual is 3,500"
          accent="var(--color-primary)"
        />
        <StatCard
          label="Active listings"
          value="2,792"
          sub="is_live = true (confirmed)"
          accent="#16a34a"
        />
        <StatCard
          label="Rentals"
          value={rentQ.data ? rentQ.data.total.toLocaleString('en-IN') : '—'}
          sub="Actual: 1,320"
          accent="#7c3aed"
        />
        <StatCard
          label="Projects"
          value={projQ.data ? projQ.data.total.toLocaleString('en-IN') : '—'}
          sub="Actual: 400"
          accent="#d97706"
        />
        <StatCard
          label="Corrupt listings"
          value="315"
          sub="Impossible data — excluded from stats"
          accent="#dc2626"
        />
        <StatCard
          label="Wrong project counts"
          value="295 / 400"
          sub="Projects with incorrect total_listings"
          accent="#f97316"
        />
      </div>

      {/* ── Locality breakdown ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Listings by locality</h2>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        {localityQueries.isPending ? (
          <div style={{ padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading locality breakdown…</div>
        ) : (
          localityRows.map((row, i) => {
            const maxCount = localityRows[0]?.total || 1
            const pct = Math.round((row.total / maxCount) * 100)
            return (
              <div key={row.locality} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.65rem 1rem',
                borderBottom: i < localityRows.length - 1 ? '1px solid var(--color-border)' : undefined,
              }}>
                <span style={{ minWidth: 140, fontSize: '0.875rem', textTransform: 'capitalize' }}>{row.locality}</span>
                <div style={{ flex: 1, background: 'var(--color-bg)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 4 }} />
                </div>
                <span style={{ minWidth: 48, fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>
                  {row.total.toLocaleString('en-IN')}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* ── API audit findings ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>API audit — what the documentation got wrong</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        The documentation was AI-generated from an old changelog and was never reviewed against the live API.
        Every discrepancy below was confirmed by testing the running service.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        <FindingCard
          title="Token field name wrong"
          category="auth"
          body='Login response field is "access_token", not "token" as documented. Code using response.token silently gets undefined.'
        />
        <FindingCard
          title="Token expiry 15 min, not 24h"
          category="auth"
          body="expires_in is 900 seconds (15 minutes), not 86400 (24 hours). Refresh flow needed every 15 minutes."
        />
        <FindingCard
          title="API key must be in header"
          category="auth"
          body="X-API-Key header required; documented ?api_key= query parameter is rejected with a 401."
        />
        <FindingCard
          title="Logout is client-side only"
          category="auth"
          body='POST /auth/logout says "tokens are stateless; discard them client side" — it does not invalidate tokens server-side as documented.'
        />
        <FindingCard
          title="Limit capped at 50, not 200"
          category="pagination"
          body="Any limit value above 50 is silently capped at 50. Documented maximum is 200. Extracting the full dataset requires 70 requests, not 17."
        />
        <FindingCard
          title="page param ignored, use offset"
          category="pagination"
          body="The documented page parameter is silently ignored. Only offset works. Response shape is {limit, offset, count, total, has_more, results} — not {page, page_size}."
        />
        <FindingCard
          title="total field underreports records"
          category="pagination"
          body="Declared total=3,233 for listings but 3,500 records are actually retrievable by following has_more to the end. Same on rentals (+101) and projects (+30)."
        />
        <FindingCard
          title="sort_by silently ignored"
          category="sorting"
          body="sort_by and order parameters have no effect on any endpoint tested (price, posted_at, bedroom). Results always come in default insertion order."
        />
        <FindingCard
          title="Four endpoints don't exist"
          category="missing_endpoint"
          body="/v1/listing/{id} (singular), /v1/listings/{id}/similar, /v1/analytics/summary, /v1/favourites — all return 404. Correct path for single listing is /v1/listings/{id}."
        />
        <FindingCard
          title="posted_at has no timezone"
          category="timestamps"
          body='Documented as "ISO 8601, UTC, Z suffix." Actual values have no suffix (e.g. "2026-08-19T10:52:00"). Server clock is IST so timestamps are IST-local, not UTC.'
        />
        <FindingCard
          title="Project prices not in rupees"
          category="units"
          body="price_min and price_max documented as rupees. Actual values are 1–99 — consistent with crores/lakhs. 184 of 400 projects show price_min > price_max (mixed units)."
        />
        <FindingCard
          title="315 corrupt listing records"
          category="data_quality"
          body="Records with impossible data: negative prices, impossibly low positive prices, floor > total_floors, carpet area > super built-up area, and ~300 with carpet < 150 sqft for 1+ BHK (likely sqm entered as sqft)."
        />
      </div>

      {/* ── Data quality summary ── */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Data quality snapshot</h2>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}>
        {[
          ['Total records (all sources)', '3,500'],
          ['Active (is_live = true)', '2,792'],
          ['Inactive (is_live = false)', '708'],
          ['Corrupt (impossible data)', '315'],
          ['Unique physical properties', '3,499'],
          ['Cross-source duplicates', '1 pair'],
          ['Avg price/sqft — live 2 BHK', '₹14,228'],
        ].map(([label, value], i, arr) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.7rem 1rem',
            borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : undefined,
          }}>
            <span style={{ fontSize: '0.875rem' }}>{label}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
