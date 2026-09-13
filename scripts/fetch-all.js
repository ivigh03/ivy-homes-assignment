// scripts/fetch-all.js
// Downloads all records from /v1/listings, /v1/rentals, /v1/projects
// Uses offset-based pagination with the actual API limit of 50 (not 200 as documented)

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')

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

fs.mkdirSync(DATA_DIR, { recursive: true })

let accessToken = null
let tokenExpiresAt = 0

const http = axios.create({ baseURL: BASE_URL, timeout: 30000 })

async function ensureToken() {
  // Refresh 60s before expiry
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) return
  const res = await http.post('/auth/login',
    { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    { headers: { 'X-API-Key': API_KEY } }
  )
  accessToken = res.data.access_token
  tokenExpiresAt = Date.now() + res.data.expires_in * 1000
  console.log(`  [auth] token refreshed, expires in ${res.data.expires_in}s`)
}

async function get(endpoint, params = {}) {
  await ensureToken()
  const res = await http.get(endpoint, {
    params,
    headers: { 'X-API-Key': API_KEY, Authorization: `Bearer ${accessToken}` },
  })
  return res.data
}

// Fetch every page from an endpoint using offset-based pagination
async function fetchAll(endpoint, pageLimit = 50) {
  const records = []
  let offset = 0
  let declaredTotal = null
  let pageIndex = 0

  while (true) {
    const data = await get(endpoint, { limit: pageLimit, offset })

    if (declaredTotal === null) declaredTotal = data.total

    const batch = data.results ?? []
    records.push(...batch)
    pageIndex++

    process.stdout.write(
      `\r  [${endpoint}] page ${pageIndex}: got ${records.length} / declared ${declaredTotal}    `
    )

    if (!data.has_more) break
    offset += pageLimit
  }

  process.stdout.write('\n')

  return {
    endpoint,
    declared_total: declaredTotal,
    fetched_count: records.length,
    matches_total: records.length === declaredTotal,
    records,
  }
}

function checkDuplicates(records, idField) {
  const seen = new Set()
  const dupes = []
  for (const r of records) {
    const id = r[idField]
    if (seen.has(id)) dupes.push(id)
    seen.add(id)
  }
  return dupes
}

async function main() {
  console.log('=== Ivy Homes Full Dataset Extraction ===')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`API Key: ${API_KEY.slice(0, 8)}...`)
  console.log()

  // Verify the actual page limit cap
  await ensureToken()
  const probe = await get('/v1/listings', { limit: 999 })
  console.log(`Limit cap probe: requested 999, got limit=${probe.limit} count=${probe.count}`)

  const LIMIT = probe.limit // use whatever the API gives us

  console.log(`\nUsing page size: ${LIMIT}`)
  console.log()

  // --- Listings ---
  console.log('Fetching listings...')
  const listings = await fetchAll('/v1/listings', LIMIT)
  const listingDupes = checkDuplicates(listings.records, 'listing_id')
  console.log(`  declared=${listings.declared_total} fetched=${listings.fetched_count} matches=${listings.matches_total}`)
  console.log(`  duplicate listing_ids across pages: ${listingDupes.length}`)
  if (listingDupes.length > 0) console.log(`  dupes: ${listingDupes.slice(0, 10).join(', ')}`)

  fs.writeFileSync(path.join(DATA_DIR, 'listings.json'), JSON.stringify(listings, null, 2))
  console.log('  Saved: data/listings.json')

  // --- Rentals ---
  console.log('\nFetching rentals...')
  const rentals = await fetchAll('/v1/rentals', LIMIT)
  const rentalDupes = checkDuplicates(rentals.records, 'listing_id')
  console.log(`  declared=${rentals.declared_total} fetched=${rentals.fetched_count} matches=${rentals.matches_total}`)
  console.log(`  duplicate listing_ids across pages: ${rentalDupes.length}`)

  fs.writeFileSync(path.join(DATA_DIR, 'rentals.json'), JSON.stringify(rentals, null, 2))
  console.log('  Saved: data/rentals.json')

  // --- Projects ---
  console.log('\nFetching projects...')
  const projects = await fetchAll('/v1/projects', LIMIT)
  const projectDupes = checkDuplicates(projects.records, 'project_id')
  console.log(`  declared=${projects.declared_total} fetched=${projects.fetched_count} matches=${projects.matches_total}`)
  console.log(`  duplicate project_ids across pages: ${projectDupes.length}`)

  fs.writeFileSync(path.join(DATA_DIR, 'projects.json'), JSON.stringify(projects, null, 2))
  console.log('  Saved: data/projects.json')

  // --- Summary ---
  console.log('\n=== Download Summary ===')
  console.log(`Listings:  ${listings.fetched_count} records`)
  console.log(`Rentals:   ${rentals.fetched_count} records`)
  console.log(`Projects:  ${projects.fetched_count} records`)

  const meta = {
    downloaded_at: new Date().toISOString(),
    actual_page_limit: LIMIT,
    listings: { declared_total: listings.declared_total, fetched: listings.fetched_count },
    rentals: { declared_total: rentals.declared_total, fetched: rentals.fetched_count },
    projects: { declared_total: projects.declared_total, fetched: projects.fetched_count },
  }
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2))
}

main().catch(err => {
  console.error('\nFatal:', err.response?.data ?? err.message)
  process.exit(1)
})
