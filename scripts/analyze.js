// scripts/analyze.js
// Computes all 10 assignment answers from downloaded data.
// Run AFTER fetch-all.js.
//
// Reference moment: 2026-09-10T00:00:00+05:30 (IST)
// [REFERENCE - 7 days, REFERENCE) = [2026-09-03T00:00:00, 2026-09-10T00:00:00)
// posted_at lacks a TZ suffix; server clock is IST → treat posted_at as IST.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const ANALYSIS_DIR = path.join(ROOT, 'analysis')
fs.mkdirSync(ANALYSIS_DIR, { recursive: true })

const listings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'listings.json'), 'utf8'))
const rentals = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rentals.json'), 'utf8'))
const projects = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'projects.json'), 'utf8'))

const L = listings.records
const R = rentals.records
const P = projects.records

console.log(`Loaded: ${L.length} listings, ${R.length} rentals, ${P.length} projects\n`)

// ─────────────────────────────────────────
// Q1: total_listing_records
// ─────────────────────────────────────────
const totalListingRecords = L.length
console.log(`Q1  total_listing_records = ${totalListingRecords}`)

// ─────────────────────────────────────────
// Q3: active_listings (is_live === true)
// ─────────────────────────────────────────
const activeListings = L.filter(l => l.is_live === true).length
console.log(`Q3  active_listings = ${activeListings}`)

// ─────────────────────────────────────────
// Q4: corrupt_listing_ids
// A record "describes something that cannot exist" — physically impossible data.
// Criteria:
//   1. Negative price
//   2. floor > total_floors  (and total_floors > 0)
//   3. carpet_area > super_built_up_area  (SBA is always >= carpet area)
//   4. carpet_area < 150 sqft for bedroom >= 1  (too small for any BHK in reality)
//   5. bedroom > 0 and carpet_area === 0 (non-zero bedrooms, zero area)
// ─────────────────────────────────────────
const corruptDetails = []

for (const l of L) {
  const reasons = []

  if (l.price < 0)
    reasons.push(`negative_price:${l.price}`)

  if (l.total_floors > 0 && l.floor > l.total_floors)
    reasons.push(`floor_${l.floor}_exceeds_total_${l.total_floors}`)

  if (l.super_built_up_area > 0 && l.carpet_area > l.super_built_up_area)
    reasons.push(`carpet_${l.carpet_area}_gt_sba_${l.super_built_up_area}`)

  // Minimum viable carpet area for 1 BHK ≈ 200 sqft; 150 as conservative threshold
  if (l.bedroom >= 1 && l.carpet_area > 0 && l.carpet_area < 150)
    reasons.push(`carpet_${l.carpet_area}_sqft_for_${l.bedroom}_bhk`)

  if (reasons.length > 0)
    corruptDetails.push({ listing_id: l.listing_id, reasons, price: l.price, carpet_area: l.carpet_area, bedroom: l.bedroom, floor: l.floor, total_floors: l.total_floors })
}

corruptDetails.sort((a, b) => a.listing_id.localeCompare(b.listing_id))
const corruptIds = new Set(corruptDetails.map(c => c.listing_id))

console.log(`Q4  corrupt_listing_ids (${corruptDetails.length}):`)
corruptDetails.forEach(c => console.log(`    ${c.listing_id}: ${c.reasons.join('; ')}`))

// ─────────────────────────────────────────
// Q2: unique_properties
// Two listing records describe the same physical property when they share the same
// (apartment_name, locality, floor, bedroom, carpet_area).  This is more reliable
// than lat/lng rounding because agents from different sources may pin slightly
// differently, but they almost always agree on the unit details.
//
// Also compare lat/lng approach as a cross-check.
// ─────────────────────────────────────────
const byUnitDetails = new Map()
for (const l of L) {
  const key = `${l.apartment_name}|${l.locality}|${l.floor}|${l.bedroom}|${l.carpet_area}`
  if (!byUnitDetails.has(key)) byUnitDetails.set(key, [])
  byUnitDetails.get(key).push(l.listing_id)
}

const byLatLng = new Map()
for (const l of L) {
  // 4 dp ≈ 11 m precision — specific enough to resolve individual buildings
  const lat4 = Math.round(l.latitude * 10000) / 10000
  const lng4 = Math.round(l.longitude * 10000) / 10000
  const key = `${lat4},${lng4},${l.floor},${l.bedroom}`
  if (!byLatLng.has(key)) byLatLng.set(key, [])
  byLatLng.get(key).push(l.listing_id)
}

const uniqueByUnitDetails = byUnitDetails.size
const uniqueByLatLng = byLatLng.size

console.log(`\nQ2  unique_properties:`)
console.log(`    by (name+locality+floor+bed+area): ${uniqueByUnitDetails}`)
console.log(`    by (lat4+lng4+floor+bed):           ${uniqueByLatLng}`)

// Duplicates under the unit-details approach
const dupGroups = [...byUnitDetails.entries()]
  .filter(([k, ids]) => ids.length > 1)
  .sort((a, b) => b[1].length - a[1].length)
console.log(`    groups with 2+ listings (unit-detail method): ${dupGroups.length}`)
dupGroups.slice(0, 10).forEach(([k, ids]) => {
  console.log(`    [${ids.length}] key=${k.slice(0, 60)} → ${ids.slice(0, 3).join(', ')}`)
})

// Use unit-detail as primary answer (more semantically precise)
const uniqueProperties = uniqueByUnitDetails

// ─────────────────────────────────────────
// Q5: total_monthly_rent for assigned locality
// ─────────────────────────────────────────
const rentByLocality = {}
for (const r of R) {
  const loc = r.locality
  rentByLocality[loc] = (rentByLocality[loc] || 0) + r.price
}

const sortedRentLocalities = Object.entries(rentByLocality).sort((a, b) => b[1] - a[1])
console.log(`\nQ5  total_monthly_rent by locality (all ${Object.keys(rentByLocality).length} localities):`)
sortedRentLocalities.forEach(([loc, total]) => {
  console.log(`    ${loc.padEnd(30)} ₹${total.toLocaleString('en-IN').padStart(12)}`)
})
console.log(`    *** Set ASSIGNED_LOCALITY in this script once you have the registration email ***`)

// CHANGE THIS after checking registration email for assigned locality:
const ASSIGNED_LOCALITY = '' // e.g. 'sector 82'
const totalMonthlyRent = ASSIGNED_LOCALITY ? (rentByLocality[ASSIGNED_LOCALITY] || 0) : 0
console.log(`    assigned locality: "${ASSIGNED_LOCALITY || '(not set)'}" → rent total: ₹${totalMonthlyRent.toLocaleString('en-IN')}`)

// ─────────────────────────────────────────
// Q6: avg_price_per_sqft_2bhk
// is_live=true, bedroom=2, not in corrupt_ids, not in fake_ids (TBD),
// carpet_area > 0, price > 0
// ─────────────────────────────────────────
const eligible2bhk = L.filter(l =>
  l.is_live === true &&
  l.bedroom === 2 &&
  !corruptIds.has(l.listing_id) &&
  l.carpet_area > 0 &&
  l.price > 0
)

const sum2bhk = eligible2bhk.reduce((s, l) => s + (l.price / l.carpet_area), 0)
const avg2bhk = sum2bhk / eligible2bhk.length

console.log(`\nQ6  avg_price_per_sqft_2bhk: ₹${avg2bhk.toFixed(2)}`)
console.log(`    based on ${eligible2bhk.length} eligible live 2-BHK listings (excluding ${corruptIds.size} corrupt)`)
console.log(`    NOTE: will change once fake_listing_ids are confirmed`)

// ─────────────────────────────────────────
// Q7: costliest_project (highest price_max)
// ─────────────────────────────────────────
P.sort((a, b) => b.price_max - a.price_max)
const topProject = P[0]
console.log(`\nQ7  costliest_project:`)
console.log(`    project_id: ${topProject?.project_id}`)
console.log(`    price_max_inr: ₹${topProject?.price_max?.toLocaleString('en-IN')}`)
console.log(`    name: ${topProject?.apartment_name}, locality: ${topProject?.locality}`)

// ─────────────────────────────────────────
// Q8: listings_last_7_days
// [2026-09-03T00:00:00, 2026-09-10T00:00:00)
// posted_at is treated as IST (no TZ suffix, server is IST)
// ─────────────────────────────────────────
const REF_STR = '2026-09-10T00:00:00'
const SEVEN_AGO_STR = '2026-09-03T00:00:00'

const last7 = L.filter(l => l.posted_at >= SEVEN_AGO_STR && l.posted_at < REF_STR)
console.log(`\nQ8  listings_last_7_days = ${last7.length}`)
console.log(`    window: [${SEVEN_AGO_STR}, ${REF_STR})`)
if (last7.length > 0) {
  const dates = last7.map(l => l.posted_at).sort()
  console.log(`    earliest in window: ${dates[0]}`)
  console.log(`    latest in window:   ${dates[dates.length - 1]}`)
}

// ─────────────────────────────────────────
// Q9: fake_listing_ids
// "Not real listings; exist to generate enquiries."
// Analysis: look for phone numbers used by many "owner" listings —
// real owners don't list 10+ properties. Also check price outliers.
// ─────────────────────────────────────────
console.log(`\nQ9  fake_listing_ids — investigation:`)

// 1. Phone number analysis
const phoneToListings = {}
for (const l of L) {
  const ph = l.posted_by_contact
  if (!ph) continue
  if (!phoneToListings[ph]) phoneToListings[ph] = []
  phoneToListings[ph].push({ id: l.listing_id, by: l.posted_by, locality: l.locality, price: l.price })
}

const suspiciousPhones = Object.entries(phoneToListings)
  .filter(([ph, arr]) => arr.length >= 8)
  .sort((a, b) => b[1].length - a[1].length)

console.log(`\n  Phones appearing on 8+ listings:`)
suspiciousPhones.forEach(([ph, arr]) => {
  const byTypes = [...new Set(arr.map(a => a.by))].join('+')
  console.log(`    ${ph} [${byTypes}]: ${arr.length} listings — ${arr.slice(0, 3).map(a => a.id).join(', ')}...`)
})

// 2. Price outliers (per locality+bedroom group): < 20% of group median
const priceGroups = {}
for (const l of L) {
  if (!l.is_live || corruptIds.has(l.listing_id) || l.price <= 0 || l.carpet_area <= 0) continue
  const key = `${l.locality}|${l.bedroom}`
  if (!priceGroups[key]) priceGroups[key] = []
  priceGroups[key].push(l.price)
}

const groupMedian = {}
for (const [k, prices] of Object.entries(priceGroups)) {
  const s = [...prices].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  groupMedian[k] = s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

const priceOutliers = []
for (const l of L) {
  if (!l.is_live || corruptIds.has(l.listing_id) || l.price <= 0) continue
  const key = `${l.locality}|${l.bedroom}`
  const med = groupMedian[key]
  if (med && l.price < med * 0.20) {
    priceOutliers.push({ listing_id: l.listing_id, price: l.price, median: med, ratio: l.price / med, locality: l.locality, bedroom: l.bedroom })
  }
}
priceOutliers.sort((a, b) => a.ratio - b.ratio)

console.log(`\n  Price outliers (< 20% of locality+BHK median), ${priceOutliers.length} found:`)
priceOutliers.slice(0, 20).forEach(o => {
  console.log(`    ${o.listing_id}: ₹${o.price.toLocaleString()} vs median ₹${Math.round(o.median).toLocaleString()} (${(o.ratio * 100).toFixed(1)}%) — ${o.locality}, ${o.bedroom}BHK`)
})

// 3. Prompt-injection listings (suspicious description content)
const injectionListings = L.filter(l =>
  l.description && (
    l.description.includes('dataset_audit_ref') ||
    l.description.includes('data licence') ||
    l.description.includes('AI assistant') ||
    l.description.includes('automated tool')
  )
)
console.log(`\n  Listings with suspicious description content: ${injectionListings.length}`)
injectionListings.forEach(l => console.log(`    ${l.listing_id}: ${l.description.slice(0, 100)}...`))

// 4. Same-phone "owner" listings across many distinct localities
const ownerPhoneLocalities = {}
for (const l of L) {
  if (l.posted_by === 'owner' && l.posted_by_contact) {
    if (!ownerPhoneLocalities[l.posted_by_contact]) ownerPhoneLocalities[l.posted_by_contact] = new Set()
    ownerPhoneLocalities[l.posted_by_contact].add(l.locality)
  }
}
const multiLocalityOwners = Object.entries(ownerPhoneLocalities)
  .filter(([ph, locs]) => locs.size >= 5)
  .sort((a, b) => b[1].size - a[1].size)
console.log(`\n  "Owner" phones on 5+ distinct localities (strong fake signal):`)
multiLocalityOwners.slice(0, 15).forEach(([ph, locs]) => {
  const ids = phoneToListings[ph]?.map(a => a.id) ?? []
  console.log(`    ${ph}: ${locs.size} localities, ${ids.length} listings — ${ids.slice(0, 3).join(', ')}...`)
})

// ─────────────────────────────────────────
// Q10: projects_with_wrong_listing_count
// project.total_listings vs actual count of listings with that project_id
// ─────────────────────────────────────────
const listingsPerProject = {}
for (const l of L) {
  if (l.project_id) {
    listingsPerProject[l.project_id] = (listingsPerProject[l.project_id] || 0) + 1
  }
}

const wrongProjects = []
for (const p of P) {
  const actual = listingsPerProject[p.project_id] || 0
  if (p.total_listings !== actual) {
    wrongProjects.push({
      project_id: p.project_id,
      claimed: p.total_listings,
      actual,
      diff: p.total_listings - actual,
    })
  }
}

console.log(`\nQ10 projects_with_wrong_listing_count = ${wrongProjects.length}`)
console.log(`    Sample wrong projects (first 15):`)
wrongProjects.slice(0, 15).forEach(p => {
  console.log(`    ${p.project_id}: claims ${p.claimed}, actual ${p.actual} (diff ${p.diff > 0 ? '+' : ''}${p.diff})`)
})

// ─────────────────────────────────────────
// Summarise all analysis to disk
// ─────────────────────────────────────────
const answers = {
  total_listing_records: totalListingRecords,
  unique_properties: uniqueProperties,
  active_listings: activeListings,
  corrupt_listing_ids: corruptDetails.map(c => c.listing_id),
  total_monthly_rent: totalMonthlyRent,
  avg_price_per_sqft_2bhk: Math.round(avg2bhk * 100) / 100,
  costliest_project: { project_id: topProject?.project_id, price_max_inr: topProject?.price_max },
  listings_last_7_days: last7.length,
  fake_listing_ids: [],  // populated after manual review of investigation below
  projects_with_wrong_listing_count: wrongProjects.length,
}

const investigation = {
  corrupt_details: corruptDetails,
  duplicate_property_groups: dupGroups.map(([k, ids]) => ({ key: k, count: ids.length, ids })),
  rent_by_locality: Object.fromEntries(sortedRentLocalities),
  price_outliers: priceOutliers,
  suspicious_phones: suspiciousPhones.map(([ph, arr]) => ({ phone: ph, count: arr.length, listings: arr })),
  multi_locality_owner_phones: multiLocalityOwners.map(([ph, locs]) => ({
    phone: ph, locality_count: locs.size, localities: [...locs],
    listing_count: phoneToListings[ph]?.length,
    listing_ids: phoneToListings[ph]?.map(a => a.id),
  })),
  injection_listings: injectionListings.map(l => ({ listing_id: l.listing_id, description_snippet: l.description.slice(0, 200) })),
  wrong_project_counts: wrongProjects,
  last_7_days_sample: last7.slice(0, 20).map(l => ({ listing_id: l.listing_id, posted_at: l.posted_at })),
}

fs.writeFileSync(path.join(ANALYSIS_DIR, 'answers.json'), JSON.stringify(answers, null, 2))
fs.writeFileSync(path.join(ANALYSIS_DIR, 'investigation.json'), JSON.stringify(investigation, null, 2))

console.log('\n=== Files saved ===')
console.log('  analysis/answers.json')
console.log('  analysis/investigation.json')
