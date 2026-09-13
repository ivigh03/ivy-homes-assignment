import { useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getProjects } from '../api/projects'
import ProjectCard from '../components/ProjectCard'
import { useDebounce } from '../hooks/useDebounce'

const PAGE_SIZE = 20

export default function ProjectsPage() {
  const [localityInput, setLocalityInput] = useState('')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)

  const locality = useDebounce(localityInput, 400)

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setOffset(0)
  }, [locality])

  function handleStatus(e) { setStatus(e.target.value); setOffset(0) }

  const queryParams = {
    limit: PAGE_SIZE,
    offset,
    ...(locality.trim() && { locality: locality.trim().toLowerCase() }),
    ...(status && { project_status: status }),
  }

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['projects', queryParams],
    queryFn: () => getProjects(queryParams),
    placeholderData: keepPreviousData,
  })

  const total = data?.total ?? 0
  const projects = data?.results ?? []
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasNext = data?.has_more ?? false
  const hasPrev = offset > 0
  const hasActiveFilters = localityInput || status

  function clearFilters() {
    setLocalityInput(''); setStatus(''); setOffset(0)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Projects</h1>
        {!isLoading && !isError && (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            {total.toLocaleString('en-IN')} projects
          </span>
        )}
        {isFetching && !isLoading && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>updating…</span>}
      </div>

      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', padding: '0.875rem 1rem', marginBottom: '1.25rem',
      }}>
        <FilterField label="Locality">
          <input type="text" placeholder="e.g. sector 82" value={localityInput}
            onChange={e => setLocalityInput(e.target.value)} style={inputStyle} />
        </FilterField>
        <FilterField label="Status">
          <select value={status} onChange={handleStatus} style={inputStyle}>
            <option value="">Any</option>
            <option value="under construction">Under Construction</option>
            <option value="ready to move">Ready to Move</option>
            <option value="launched">Launched</option>
            <option value="completed">Completed</option>
          </select>
        </FilterField>
        {hasActiveFilters && (
          <button onClick={clearFilters} style={{ alignSelf: 'flex-end', padding: '0.38rem 0.75rem', fontSize: '0.8rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-muted)' }}>
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : isError ? (
        <ErrorState message={error?.response?.data?.detail || error?.message} />
      ) : projects.length === 0 ? (
        <EmptyState hasFilters={!!hasActiveFilters} />
      ) : (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem', marginBottom: '1.5rem',
            opacity: isFetching ? 0.65 : 1, transition: 'opacity 0.2s',
          }}>
            {projects.map(p => <ProjectCard key={p.project_id} project={p} />)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              {(offset + 1).toLocaleString()}–{Math.min(offset + PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PaginationBtn disabled={!hasPrev} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>← Prev</PaginationBtn>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', minWidth: 96, textAlign: 'center' }}>
                Page {currentPage} / {totalPages}
              </span>
              <PaginationBtn disabled={!hasNext} onClick={() => setOffset(offset + PAGE_SIZE)}>Next →</PaginationBtn>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FilterField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.73rem', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  )
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 172, borderRadius: 'var(--radius)' }} />)}
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '0.5rem' }}>Could not load projects</p>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{message}</p>}
    </div>
  )
}

function EmptyState({ hasFilters }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No projects found</p>
      {hasFilters && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Try adjusting or clearing your filters.</p>}
    </div>
  )
}

function PaginationBtn({ children, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '0.38rem 0.9rem', fontSize: '0.85rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      {children}
    </button>
  )
}

const inputStyle = { padding: '0.38rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.85rem', background: 'var(--color-bg)', minWidth: 130 }
