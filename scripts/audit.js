// scripts/audit.js
// Systematically tests API behaviour and records confirmed discrepancies.
// Run AFTER fetch-all.js so we don't duplicate downloads.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ANALYSIS_DIR = path.join(ROOT, 'analysis')
fs.mkdirSync(ANALYSIS_DIR, { recursive: true })

function readEnv() {
  const env = {}
  try {
    fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').forEach(line => {
      const eq = line.indexOf('=')
      if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    })
  } catch {}
  return env
}

const ENV = readEnv()
const BASE_URL = ENV.VITE_API_BASE_URL || 'https://solve.ivy.homes'
const API_KEY = ENV.VITE_API_KEY || ''
const DEMO_PASSWORD = ENV.VITE_DEMO_PASSWORD || ''
const DEMO_EMAIL = 'demo1@ivy.homes'

const http = axios.create({ baseURL: BASE_URL, timeout: 15000 })

let accessToken = null
let refreshToken = null

async function login() {
  const res = await http.post('/auth/login',
    { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    { headers: { 'X-API-Key': API_KEY } }
  )
  accessToken = res.data.access_token
  refreshToken = res.data.refresh_token
  return res.data
}

async function get(endpoint, params = {}, extraHeaders = {}) {
  return http.get(endpoint, {
    params,
    headers: { 'X-API-Key': API_KEY, Authorization: `Bearer ${accessToken}`, ...extraHeaders },
  }).catch(e => e.response)
}

async function post(endpoint, body = {}, extraHeaders = {}) {
  return http.post(endpoint, body, {
    headers: { 'X-API-Key': API_KEY, Authorization: `Bearer ${accessToken}`, ...extraHeaders },
  }).catch(e => e.response)
}

const findings = []
const results = {}

function record(key, value) {
  results[key] = value
  console.log(`  [${key}] ${JSON.stringify(value).slice(0, 120)}`)
}

function addFinding(f) {
  findings.push(f)
  console.log(`  ** FINDING: ${f.category} @ ${f.endpoint} — ${f.documented} → ${f.actual}`)
}

async function main() {
  console.log('=== API Audit ===\n')
  const loginData = await login()

  // ========================================
  // AUTH SECTION
  // ========================================
  console.log('--- AUTH ---')

  record('login_response_fields', Object.keys(loginData))
  record('expires_in_seconds', loginData.expires_in)
  record('token_type', loginData.token_type)
  record('user_fields', Object.keys(loginData.user || {}))
  record('has_refresh_token', !!loginData.refresh_token)
  record('has_refresh_url', !!loginData.refresh_url)

  if (loginData.expires_in !== 86400) {
    addFinding({
      endpoint: '/auth/login',
      category: 'auth',
      documented: 'expires_in: 86400 (24 hours)',
      actual: `expires_in: ${loginData.expires_in} (${loginData.expires_in / 60} minutes)`,
      how_found: 'inspected login response body',
      impact: 'Refresh token flow required much sooner than documented',
      evidence: [],
    })
  }

  if (!loginData.token) {
    addFinding({
      endpoint: '/auth/login',
      category: 'auth',
      documented: 'response field: "token"',
      actual: 'response field is "access_token" (not "token")',
      how_found: 'inspected login response body',
      impact: 'Code relying on response.token will always get undefined',
      evidence: [],
    })
  }

  if (!loginData.user?.name) {
    addFinding({
      endpoint: '/auth/login',
      category: 'completeness',
      documented: 'user object contains "email" and "name"',
      actual: `user object contains only: ${Object.keys(loginData.user || {}).join(', ')}`,
      how_found: 'inspected login response user field',
      impact: 'Code displaying user.name will show undefined',
      evidence: [],
    })
  }

  // Test: listing without bearer token (only API key)
  const noTokenRes = await get('/v1/listings', { limit: 1 }, { Authorization: undefined })
    .catch(e => e.response)
  // Axios won't delete undefined headers easily, test by not including Auth header
  const noAuthRes = await http.get('/v1/listings', {
    params: { limit: 1 },
    headers: { 'X-API-Key': API_KEY },
  }).catch(e => e.response)
  record('listings_without_bearer_token', { status: noAuthRes?.status, detail: noAuthRes?.data?.detail })

  // Test: api_key as query param
  const queryKeyRes = await http.get('/v1/listings', {
    params: { limit: 1, api_key: API_KEY },
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(e => e.response)
  record('api_key_as_query_param', { status: queryKeyRes?.status, detail: queryKeyRes?.data?.detail })

  if (queryKeyRes?.status !== 200) {
    addFinding({
      endpoint: '*',
      category: 'auth',
      documented: 'Append API key as query parameter: ?api_key=IVY26-XXXX',
      actual: `API key must be sent in X-API-Key request header, not as query parameter. Error: "${queryKeyRes?.data?.detail}"`,
      how_found: 'sent api_key as query param, received error',
      impact: 'All documented curl examples using ?api_key= will fail',
      evidence: [],
    })
  }

  // Test: /auth/logout
  const logoutRes = await post('/auth/logout')
  record('logout_response', logoutRes?.data)
  if (logoutRes?.data?.note) {
    addFinding({
      endpoint: '/auth/logout',
      category: 'auth',
      documented: 'Invalidates the current token server side',
      actual: `Tokens are stateless: "${logoutRes.data.note}"`,
      how_found: 'called POST /auth/logout and read response note',
      impact: 'Tokens cannot be invalidated server-side; logout is client-side only',
      evidence: [],
    })
  }

  // Re-login after logout test
  await login()

  // Test: /auth/refresh endpoint
  const refreshRes = await http.post('/auth/refresh',
    { refresh_token: refreshToken },
    { headers: { 'X-API-Key': API_KEY } }
  ).catch(e => e.response)
  record('auth_refresh', { status: refreshRes?.status, has_access_token: !!refreshRes?.data?.access_token })

  // ========================================
  // PAGINATION SECTION
  // ========================================
  console.log('\n--- PAGINATION ---')

  // Test documented max limit=200
  const limit200 = await get('/v1/listings', { limit: 200 })
  record('limit_200_actual_limit', limit200?.data?.limit)

  const limit999 = await get('/v1/listings', { limit: 999 })
  record('limit_999_actual_limit', limit999?.data?.limit)

  const actualMax = limit999?.data?.limit
  if (actualMax !== 200) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: 'limit parameter: Maximum 200',
      actual: `limit is silently capped at ${actualMax}; requesting 200 or 999 both return limit=${actualMax}`,
      how_found: 'sent limit=200, limit=999, both returned limit=' + actualMax,
      impact: 'Scripts expecting 200 records per page will get only ' + actualMax + '; requires 4× more requests',
      evidence: [],
    })
  }

  // Test: page parameter (should be ignored)
  const page2res = await get('/v1/listings', { limit: 2, page: 2 })
  const offset0res = await get('/v1/listings', { limit: 2, offset: 0 })
  const sameResults = JSON.stringify(page2res?.data?.results?.map(r => r.listing_id)) ===
                      JSON.stringify(offset0res?.data?.results?.map(r => r.listing_id))
  record('page_param_ignored', sameResults)

  if (sameResults) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: 'page parameter (1-indexed) controls which page to return',
      actual: 'page parameter is silently ignored; pagination requires offset parameter instead',
      how_found: 'page=2,limit=2 returned same results as offset=0,limit=2',
      impact: 'Page-based iteration misses records beyond page 1',
      evidence: [],
    })
  }

  // Test: response shape fields
  const pageRes = await get('/v1/listings', { limit: 1 })
  record('response_shape_fields', Object.keys(pageRes?.data || {}))

  const hasPageSize = 'page_size' in (pageRes?.data || {})
  const hasPage = 'page' in (pageRes?.data || {})
  const hasOffset = 'offset' in (pageRes?.data || {})
  const hasHasMore = 'has_more' in (pageRes?.data || {})

  if (!hasPageSize || !hasPage) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'pagination',
      documented: 'collection response shape: { total, page, page_size, results }',
      actual: `actual shape: { ${Object.keys(pageRes?.data || {}).join(', ')} } — has_more and offset instead of page/page_size`,
      how_found: 'inspected collection response envelope fields',
      impact: 'Code reading response.page or response.page_size always gets undefined',
      evidence: [],
    })
  }

  // ========================================
  // FILTERS SECTION
  // ========================================
  console.log('\n--- FILTERS ---')

  // property_type filter
  const ptRes = await get('/v1/listings', { limit: 5, property_type: 'apartment' })
  const allApartments = ptRes?.data?.results?.every(r => r.property_type === 'apartment')
  record('property_type_filter_works', allApartments)

  // bhk filter
  const bhkRes = await get('/v1/listings', { limit: 5, bhk: 2 })
  const all2bhk = bhkRes?.data?.results?.every(r => r.bedroom === 2)
  record('bhk_filter_works', all2bhk)

  // locality filter
  const locRes = await get('/v1/listings', { limit: 5, locality: 'sector 82' })
  const allSector82 = locRes?.data?.results?.every(r => r.locality === 'sector 82')
  record('locality_filter_works', allSector82)

  // furnishing filter
  const furnRes = await get('/v1/listings', { limit: 5, furnishing: 'unfurnished' })
  const allUnfurnished = furnRes?.data?.results?.every(r => r.furnishing === 'unfurnished')
  record('furnishing_filter_works', allUnfurnished)

  // min_price / max_price filter
  const priceRes = await get('/v1/listings', { limit: 5, min_price: 10000000, max_price: 12000000 })
  const allInRange = priceRes?.data?.results?.every(r => r.price >= 10000000 && r.price <= 12000000)
  record('price_range_filter_works', allInRange)
  record('price_range_results', priceRes?.data?.results?.map(r => r.price))

  // project_id filter (undocumented — test if it works)
  const projFilterRes = await get('/v1/listings', { limit: 2, project_id: 'P60096' })
  const projFilterTotal = projFilterRes?.data?.total
  const allMatchProject = projFilterRes?.data?.results?.every(r => r.project_id === 'P60096')
  record('project_id_filter', { total: projFilterTotal, all_match: allMatchProject })
  // If total == full dataset total, filter is ignored
  const fullTotal = pageRes?.data?.total
  if (projFilterTotal === fullTotal) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'filters',
      documented: 'not documented',
      actual: 'project_id query parameter is silently ignored (returns full result set)',
      how_found: '?project_id=P60096 returned same total as unfiltered query',
      impact: 'Cannot filter listings by project via API; must do client-side',
      evidence: ['P60096'],
    })
  }

  // ========================================
  // SORTING SECTION
  // ========================================
  console.log('\n--- SORTING ---')

  const sortAsc = await get('/v1/listings', { limit: 5, sort_by: 'price', order: 'asc' })
  const sortDesc = await get('/v1/listings', { limit: 5, sort_by: 'price', order: 'desc' })
  const ascIds = sortAsc?.data?.results?.map(r => r.listing_id)
  const descIds = sortDesc?.data?.results?.map(r => r.listing_id)
  const priceSortSameOrder = JSON.stringify(ascIds) === JSON.stringify(descIds)
  record('price_sort_asc_ids', ascIds)
  record('price_sort_desc_ids', descIds)
  record('price_sort_asc_prices', sortAsc?.data?.results?.map(r => r.price))
  record('price_sort_desc_prices', sortDesc?.data?.results?.map(r => r.price))
  record('price_sort_gives_same_order_asc_vs_desc', priceSortSameOrder)

  if (priceSortSameOrder) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'sorting',
      documented: 'sort_by=price with order=asc|desc sorts by price',
      actual: 'sort_by=price returns identical order for both asc and desc — parameter appears silently ignored',
      how_found: 'compared first 5 listing_ids for sort_by=price&order=asc vs desc, got same sequence',
      impact: 'Price sorting is unreliable; results are in default insertion order',
      evidence: ascIds?.slice(0, 5) ?? [],
    })
  }

  const postedAsc = await get('/v1/listings', { limit: 5, sort_by: 'posted_at', order: 'asc' })
  const postedDesc = await get('/v1/listings', { limit: 5, sort_by: 'posted_at', order: 'desc' })
  const postedAscIds = postedAsc?.data?.results?.map(r => r.listing_id)
  const postedDescIds = postedDesc?.data?.results?.map(r => r.listing_id)
  const postedSortSame = JSON.stringify(postedAscIds) === JSON.stringify(postedDescIds)
  record('posted_at_sort_same_asc_vs_desc', postedSortSame)
  record('posted_at_asc_dates', postedAsc?.data?.results?.map(r => r.posted_at))
  record('posted_at_desc_dates', postedDesc?.data?.results?.map(r => r.posted_at))

  if (postedSortSame) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'sorting',
      documented: 'sort_by=posted_at with order=asc|desc sorts by posting date',
      actual: 'sort_by=posted_at returns identical order for both asc and desc — parameter appears silently ignored',
      how_found: 'compared first 5 listing_ids for posted_at sort asc vs desc, got same sequence',
      impact: 'Date sorting is unreliable',
      evidence: postedAscIds?.slice(0, 3) ?? [],
    })
  }

  // Test bedroom sort — was working in earlier manual tests
  const bedroomAsc = await get('/v1/listings', { limit: 5, sort_by: 'bedroom', order: 'asc' })
  const bedroomDesc = await get('/v1/listings', { limit: 5, sort_by: 'bedroom', order: 'desc' })
  record('bedroom_asc_bedrooms', bedroomAsc?.data?.results?.map(r => r.bedroom))
  record('bedroom_desc_bedrooms', bedroomDesc?.data?.results?.map(r => r.bedroom))

  // ========================================
  // TIMESTAMPS SECTION
  // ========================================
  console.log('\n--- TIMESTAMPS ---')

  // posted_at format: does it have timezone info?
  const sampleListings = (await get('/v1/listings', { limit: 5 }))?.data?.results ?? []
  record('posted_at_sample', sampleListings.map(r => r.posted_at))
  const hasTimezone = sampleListings.some(r => r.posted_at?.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(r.posted_at))
  record('posted_at_has_timezone_suffix', hasTimezone)

  if (!hasTimezone) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'timestamps',
      documented: 'Timestamps: ISO 8601, UTC, Z suffix, everywhere in the API',
      actual: 'posted_at has no timezone suffix (e.g. "2026-08-19T10:52:00") — server clock is IST (+05:30) so timestamps are likely IST-local',
      how_found: 'inspected posted_at values in listing records, none had Z or +05:30',
      impact: 'Timezone-aware date comparisons will be off by 5h30m if treated as UTC',
      evidence: sampleListings.map(r => r.posted_at).slice(0, 5),
    })
  }

  // ========================================
  // ENDPOINTS SECTION
  // ========================================
  console.log('\n--- ENDPOINTS ---')

  // /v1/listing/{id} (singular — as documented)
  const singularRes = await get('/v1/listing/100-6000047')
  record('v1_listing_singular_status', singularRes?.status)

  if (singularRes?.status === 404 || singularRes?.data?.detail) {
    addFinding({
      endpoint: '/v1/listing/{id}',
      category: 'missing_endpoint',
      documented: 'GET /v1/listing/{listing_id} — a single listing',
      actual: 'returns 404 Not Found; correct path is GET /v1/listings/{listing_id} (plural)',
      how_found: 'called /v1/listing/100-6000047 and got 404',
      impact: 'Code using singular path always gets 404',
      evidence: ['100-6000047'],
    })
  }

  // /v1/listings/{id} (plural — actual correct path)
  const pluralRes = await get('/v1/listings/100-6000047')
  record('v1_listings_plural_status', pluralRes?.status)

  // /v1/listings/{id}/similar
  const similarRes = await get('/v1/listings/100-6000047/similar')
  record('similar_endpoint_status', similarRes?.status)

  if (similarRes?.status === 404 || similarRes?.data?.detail) {
    addFinding({
      endpoint: '/v1/listings/{id}/similar',
      category: 'missing_endpoint',
      documented: 'GET /v1/listings/{listing_id}/similar — up to ten comparable listings',
      actual: 'returns 404 Not Found',
      how_found: 'called endpoint directly',
      impact: '"You may also like" feature cannot be implemented',
      evidence: ['100-6000047'],
    })
  }

  // /v1/analytics/summary
  const analyticsRes = await get('/v1/analytics/summary')
  record('analytics_summary_status', analyticsRes?.status)

  if (analyticsRes?.status === 404 || analyticsRes?.data?.detail) {
    addFinding({
      endpoint: '/v1/analytics/summary',
      category: 'missing_endpoint',
      documented: 'GET /v1/analytics/summary — pre-computed aggregates for your city',
      actual: 'returns 404 Not Found',
      how_found: 'called endpoint directly',
      impact: 'Analytics/insights screen cannot use this endpoint',
      evidence: [],
    })
  }

  // /v1/favourites
  const favsRes = await get('/v1/favourites')
  record('favourites_endpoint_status', favsRes?.status)

  if (favsRes?.status === 404 || favsRes?.data?.detail) {
    addFinding({
      endpoint: '/v1/favourites',
      category: 'missing_endpoint',
      documented: 'GET /v1/favourites — logged-in user saved listings',
      actual: 'returns 404 Not Found',
      how_found: 'called endpoint directly with valid auth',
      impact: 'Favourites/saved feature cannot use this endpoint',
      evidence: [],
    })
  }

  // Check rentals for is_live, deposit fields (undocumented)
  const rentalSample = (await get('/v1/rentals', { limit: 1 }))?.data?.results?.[0]
  record('rental_sample_fields', Object.keys(rentalSample || {}))
  if ('is_live' in (rentalSample || {})) {
    addFinding({
      endpoint: '/v1/rentals',
      category: 'completeness',
      documented: 'rental object has no is_live field in documentation',
      actual: 'rental records include is_live boolean field',
      how_found: 'inspected rental record fields',
      impact: 'is_live exists on rentals but is undocumented; can be used for filtering',
      evidence: [],
    })
  }

  // Check listings for is_live field (undocumented)
  const listingSample = (await get('/v1/listings', { limit: 1 }))?.data?.results?.[0]
  if ('is_live' in (listingSample || {})) {
    addFinding({
      endpoint: '/v1/listings',
      category: 'completeness',
      documented: 'listing object does not include is_live field',
      actual: 'listing records include is_live boolean field (appears to indicate active listings)',
      how_found: 'inspected listing record fields',
      impact: 'is_live allows filtering active vs inactive listings — not documented but critical for Q3 of assignment',
      evidence: [],
    })
  }

  // ========================================
  // SAVE RESULTS
  // ========================================
  const output = { tested_at: new Date().toISOString(), results, findings }
  fs.writeFileSync(path.join(ANALYSIS_DIR, 'audit-results.json'), JSON.stringify(output, null, 2))
  console.log(`\n=== Audit complete: ${findings.length} findings ===`)
  findings.forEach((f, i) => console.log(`  ${i + 1}. [${f.category}] ${f.endpoint}: ${f.actual.slice(0, 80)}`))
}

main().catch(err => {
  console.error('\nFatal:', err.response?.data ?? err.message)
  process.exit(1)
})
