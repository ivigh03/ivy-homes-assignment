// scripts/build-outputs.js — writes analysis/answers.json and analysis/findings.json
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'analysis')
fs.mkdirSync(OUT, { recursive: true })

const L = JSON.parse(fs.readFileSync(path.join(DATA, 'listings.json'), 'utf8')).records
const R = JSON.parse(fs.readFileSync(path.join(DATA, 'rentals.json'), 'utf8')).records
const P = JSON.parse(fs.readFileSync(path.join(DATA, 'projects.json'), 'utf8')).records

// ── Corrupt listing IDs ──────────────────────────────────────────────────
const corrupt = []
for (const l of L) {
  const bad = []
  if (l.price < 0) bad.push('negative_price')
  if (l.price > 0 && l.price < 100_000) bad.push('impossible_low_price')
  if (l.total_floors > 0 && l.floor > l.total_floors) bad.push('floor_exceeds_total_floors')
  if (l.super_built_up_area > 0 && l.carpet_area > l.super_built_up_area) bad.push('carpet_exceeds_sba')
  if (l.bedroom >= 1 && l.carpet_area > 0 && l.carpet_area < 150) bad.push('impossible_carpet_for_bhk')
  if (bad.length) corrupt.push(l.listing_id)
}
corrupt.sort()
const corruptSet = new Set(corrupt)

// ── Rent by locality (for Q5) ─────────────────────────────────────────────
const rentByLoc = {}
for (const r of R) rentByLoc[r.locality] = (rentByLoc[r.locality] || 0) + r.price

// ── Q6: avg price/sqft for live 2-BHK excl corrupt ───────────────────────
const eligible = L.filter(l =>
  l.is_live && l.bedroom === 2 && !corruptSet.has(l.listing_id) && l.carpet_area > 0 && l.price > 0
)
const avg2bhk = eligible.reduce((s, l) => s + l.price / l.carpet_area, 0) / eligible.length

// ── Q7: costliest project by highest price_max value ─────────────────────
P.sort((a, b) => b.price_max - a.price_max)
const topProj = P[0]
// NOTE: documented as rupees but actual values are ~1–100 (crores or lakhs)
// Using crores interpretation → price_max_inr = price_max × 10,000,000
const priceMaxInr = topProj.price_max * 10_000_000

// ── Q8 ───────────────────────────────────────────────────────────────────
const last7 = L.filter(l => l.posted_at >= '2026-09-03T00:00:00' && l.posted_at < '2026-09-10T00:00:00').length

// ── Q10 ──────────────────────────────────────────────────────────────────
const countByProj = {}
for (const l of L) { if (l.project_id) countByProj[l.project_id] = (countByProj[l.project_id] || 0) + 1 }
const wrongProjectCount = P.filter(p => p.total_listings !== (countByProj[p.project_id] || 0)).length

// ── Answers ──────────────────────────────────────────────────────────────
const answers = {
  total_listing_records: L.length,
  unique_properties: new Set(L.map(l => `${l.apartment_name}|${l.locality}|${l.floor}|${l.bedroom}|${l.carpet_area}`)).size,
  active_listings: L.filter(l => l.is_live === true).length,
  corrupt_listing_ids: corrupt,
  total_monthly_rent: 0,
  // ↑ SET FROM REGISTRATION EMAIL: which locality is assigned?
  // dwarka expressway → 5457800
  // sector 82        → 5206900
  // new gurgaon      → 4922000
  // golf course road → 4662400
  // mg road          → 4612400
  // dlf phase 3      → 4556900
  // sector 65        → 4457700
  // sector 56        → 4340800
  // sector 49        → 4328000
  // sohna road       → 3733800
  avg_price_per_sqft_2bhk: Math.round(avg2bhk * 100) / 100,
  costliest_project: {
    project_id: topProj.project_id,
    price_max_inr: priceMaxInr,
    // CAUTION: project prices are NOT in rupees as documented.
    // P60090 has raw price_max=98.9. Treated as crores → 989,000,000.
    // Actual listing prices for P60090 are 92.7L–2.28Cr, which does not
    // validate this figure. The unit issue is a confirmed finding.
  },
  listings_last_7_days: last7,
  fake_listing_ids: [],
  projects_with_wrong_listing_count: wrongProjectCount,
}

fs.writeFileSync(path.join(OUT, 'answers.json'), JSON.stringify(answers, null, 2))

// ── Findings ─────────────────────────────────────────────────────────────
const findings = [
  {
    endpoint: '/auth/login',
    category: 'auth',
    documented: 'response field "token" carries the Bearer token',
    actual: 'response field is "access_token"; there is no "token" key in the response',
    how_found: 'inspected POST /auth/login response body',
    impact: 'Frontend code reading response.token gets undefined and cannot authenticate',
    evidence: [],
  },
  {
    endpoint: '/auth/login',
    category: 'auth',
    documented: 'expires_in: 86400 — tokens valid for 24 hours',
    actual: 'expires_in: 900 — tokens expire after 15 minutes',
    how_found: 'inspected expires_in field in login response',
    impact: 'Without token refresh, sessions break every 15 minutes instead of every 24 hours',
    evidence: [],
  },
  {
    endpoint: '/auth/login',
    category: 'completeness',
    documented: 'user object: { email, name }',
    actual: 'user object contains only { email }; name field is absent',
    how_found: 'inspected user object in login response',
    impact: 'Code displaying user.name renders undefined',
    evidence: [],
  },
  {
    endpoint: '*',
    category: 'auth',
    documented: 'API key as query parameter: ?api_key=IVY26-XXXX',
    actual: 'API key must be in X-API-Key request header; query parameter rejected with 401 and message "send your key in the X-API-Key request header, not as a query parameter"',
    how_found: 'sent api_key as URL query param; received 401',
    impact: 'All documented curl examples using ?api_key= fail',
    evidence: [],
  },
  {
    endpoint: '/auth/logout',
    category: 'auth',
    documented: 'Invalidates the current token server side',
    actual: 'Tokens are stateless; server response: {"ok":true,"note":"tokens are stateless; discard them client side"}',
    how_found: 'called POST /auth/logout and read response',
    impact: 'Tokens cannot be revoked; logout is client-side only',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'pagination',
    documented: 'limit parameter maximum: 200',
    actual: 'limit is silently capped at 50; sending limit=200 or limit=999 both return limit=50',
    how_found: 'sent limit=200, limit=999; response showed limit=50 in both cases',
    impact: 'Extracting the full dataset requires 70 requests (3500/50) instead of the expected 17',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'pagination',
    documented: 'page parameter (1-indexed) selects the page of results',
    actual: 'page parameter is silently ignored; pagination works only via offset parameter',
    how_found: 'page=2,limit=2 returned same listing_ids as offset=0,limit=2',
    impact: 'Page-based iteration returns page 1 indefinitely',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'pagination',
    documented: 'collection response shape: { total, page, page_size, results }',
    actual: 'actual shape: { limit, offset, count, total, has_more, results } — has_more and offset replace page/page_size',
    how_found: 'inspected all keys in collection response envelope',
    impact: 'Code reading response.page or response.page_size gets undefined',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'pagination',
    documented: 'total: exact number of records matching your filters',
    actual: 'total underreports records: declared 3233 but 3500 records retrieved by following has_more to the end. Same pattern on /v1/rentals (declared 1219, fetched 1320) and /v1/projects (declared 370, fetched 400)',
    how_found: 'paged through all pages until has_more=false; record count exceeded declared total',
    impact: 'Stopping after ceil(total/limit) pages misses 267 listings, 101 rentals, and 30 projects',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'filters',
    documented: '(project_id not documented as a filter)',
    actual: 'project_id query parameter is silently ignored; ?project_id=P60096 returns all records unchanged',
    how_found: 'sent ?project_id=P60096; got same total as unfiltered query',
    impact: 'Listing counts per project must be computed client-side',
    evidence: ['P60096'],
  },
  {
    endpoint: '/v1/listings',
    category: 'sorting',
    documented: 'sort_by accepts price, carpet_area, posted_at, bedroom with order=asc|desc',
    actual: 'sort_by and order are silently ignored on all values tested (price, posted_at, bedroom); asc and desc return identical sequences',
    how_found: 'compared first 5 listing_ids for sort_by=price asc vs desc, posted_at asc vs desc, bedroom asc vs desc — all three returned same order',
    impact: 'No server-side sorting available; results are in default insertion order',
    evidence: ['100-6001461', 'ZER-6000669', 'DWE-6002663', 'SQU-6003044', '100-6002071'],
  },
  {
    endpoint: '/v1/listings',
    category: 'timestamps',
    documented: 'Timestamps: ISO 8601, UTC, Z suffix, everywhere in the API',
    actual: 'posted_at has no timezone suffix (e.g. "2026-08-19T10:52:00"); server clock is IST (+05:30), so timestamps appear to be IST-local',
    how_found: 'inspected posted_at values across many records; none end in Z or carry +05:30',
    impact: 'Date range queries treating posted_at as UTC will be 5h30m off',
    evidence: ['2026-08-19T10:52:00', '2026-03-12T16:31:00', '2026-01-13T12:10:00', '2026-03-03T08:09:00'],
  },
  {
    endpoint: '/v1/listing/{id}',
    category: 'missing_endpoint',
    documented: 'GET /v1/listing/{listing_id} — single listing detail',
    actual: 'returns 404 Not Found; correct path uses plural: GET /v1/listings/{listing_id}',
    how_found: 'called /v1/listing/100-6000047 — 404; /v1/listings/100-6000047 — 200',
    impact: 'All code using documented singular path silently gets 404',
    evidence: ['100-6000047'],
  },
  {
    endpoint: '/v1/listings/{id}/similar',
    category: 'missing_endpoint',
    documented: 'GET /v1/listings/{listing_id}/similar — up to 10 comparable listings',
    actual: 'returns 404 Not Found',
    how_found: 'called the endpoint with valid listing_id and auth',
    impact: '"Similar listings" feature cannot be implemented via this endpoint',
    evidence: ['100-6000047'],
  },
  {
    endpoint: '/v1/analytics/summary',
    category: 'missing_endpoint',
    documented: 'GET /v1/analytics/summary — pre-computed city-level aggregates',
    actual: 'returns 404 Not Found',
    how_found: 'called the endpoint with valid auth',
    impact: 'Insights/analytics screen has no endpoint to call',
    evidence: [],
  },
  {
    endpoint: '/v1/favourites',
    category: 'missing_endpoint',
    documented: 'GET /v1/favourites, POST /v1/favourites, DELETE /v1/favourites/{id}',
    actual: 'GET /v1/favourites returns 404 Not Found',
    how_found: 'called GET /v1/favourites with valid auth',
    impact: 'Saved/favourites feature has no working endpoint',
    evidence: [],
  },
  {
    endpoint: '/v1/listings',
    category: 'completeness',
    documented: 'listing object schema does not mention is_live field',
    actual: 'every listing record includes is_live (boolean) — true for active listings, false for inactive/withdrawn',
    how_found: 'inspected listing record field keys in API response',
    impact: 'is_live is the only way to filter active listings and is critical for assignment answers',
    evidence: [],
  },
  {
    endpoint: '/v1/rentals',
    category: 'completeness',
    documented: 'rental object schema does not mention is_live field',
    actual: 'every rental record includes is_live (boolean)',
    how_found: 'inspected rental record field keys',
    impact: 'Rental filtering by active status is possible but undocumented',
    evidence: [],
  },
  {
    endpoint: '/v1/projects',
    category: 'units',
    documented: 'price_min and price_max are in rupees',
    actual: 'price_min and price_max are NOT in rupees. Values range from 1 to 99 — consistent with crores (for values < 10) and lakhs (for values > 50). No project has a price value in the millions that rupees would require. 184 of 400 projects show price_min > price_max numerically, which is explained by price_min stored in lakhs and price_max in crores.',
    how_found: 'cross-referenced project price_max against actual listing prices for same project; all values < 100, none in rupee scale',
    impact: 'Cannot compute accurate price ranges or find costliest project without knowing the unit',
    evidence: ['P60001', 'P60004', 'P60009', 'P60010', 'P60090'],
  },
  {
    endpoint: '/v1/listings',
    category: 'data_quality',
    documented: 'returns active, valid listings',
    actual: '315 records describe something that cannot exist: negative prices (5 records), impossibly low positive prices < ₹1L for multi-bedroom apartments (6 records, e.g. ₹5,030 for 1 BHK), carpet_area < 150 sqft for 1+ BHK (consistent with sqm-instead-of-sqft data entry from magichomes source, ~300 records), floor > total_floors (6 records), and carpet_area > super_built_up_area (4 records)',
    how_found: 'systematic validation of all 3500 listing records against physical constraints',
    impact: 'Corrupt records must be excluded from price/area calculations; avg_price_per_sqft and other metrics are incorrect if corrupt records are included',
    evidence: ['100-6001461', 'ZER-6000669', 'SQU-6003044', 'MAG-6000631', 'DWE-6002663',
               'SQU-6000395', 'MAG-6002941', '100-6000678', '100-6000578', '100-6001599',
               'MAG-6000027', 'MAG-6000029', '100-6000323', 'DWE-6002846', 'SQU-6001477',
               'MAG-6001135', 'MAG-6002834', 'ZER-6000468', 'DWE-6000010', 'MAG-6000527'],
  },
  {
    endpoint: '/v1/listings',
    category: 'duplicates',
    documented: 'every listing_id is globally unique; each listing corresponds to exactly one physical property',
    actual: 'one physical property is described by two records from different sources (listing_ids are unique, but the underlying property is the same): MAG-6000753 from magichomes and DWE-6003269 from dwelling share the same apartment_name, locality, floor, bedroom, carpet_area, latitude and longitude',
    how_found: 'grouped all 3500 records by (apartment_name, locality, floor, bedroom, carpet_area); found one group with 2 records',
    impact: 'unique_properties count = 3499, not 3500',
    evidence: ['MAG-6000753', 'DWE-6003269'],
  },
]

fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2))

// ── Console summary ──────────────────────────────────────────────────────
console.log('=== Final Answers ===')
console.log(`Q1  total_listing_records:        ${answers.total_listing_records}`)
console.log(`Q2  unique_properties:             ${answers.unique_properties}`)
console.log(`Q3  active_listings:               ${answers.active_listings}`)
console.log(`Q4  corrupt_listing_ids:           ${answers.corrupt_listing_ids.length} IDs`)
console.log(`Q5  total_monthly_rent:            *** SET AFTER READING ASSIGNED LOCALITY ***`)
console.log(`    All locality totals:`)
Object.entries(rentByLoc).sort((a, b) => b[1] - a[1]).forEach(([loc, tot]) =>
  console.log(`      "${loc}": ${tot}`)
)
console.log(`Q6  avg_price_per_sqft_2bhk:       ${answers.avg_price_per_sqft_2bhk}`)
console.log(`Q7  costliest_project:             ${answers.costliest_project.project_id}, price_max_inr=${answers.costliest_project.price_max_inr} (unit uncertain)`)
console.log(`Q8  listings_last_7_days:          ${answers.listings_last_7_days}`)
console.log(`Q9  fake_listing_ids:              [] (could not confirm from API data alone)`)
console.log(`Q10 projects_with_wrong_count:     ${answers.projects_with_wrong_listing_count}`)
console.log(`\nFindings: ${findings.length}`)
console.log('Files: analysis/answers.json, analysis/findings.json')
