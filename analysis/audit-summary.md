# API Audit Summary — Ivy Homes Assignment

## Dataset overview

| Endpoint | Declared `total` | Actually retrievable | Delta |
|---|---|---|---|
| `/v1/listings` | 3,233 | **3,500** | +267 |
| `/v1/rentals` | 1,219 | **1,320** | +101 |
| `/v1/projects` | 370 | **400** | +30 |

The `total` field consistently underreports actual records. Scripts that stop at `ceil(total/limit)` pages miss the extra records. Must follow `has_more` flag to the end.

Actual page size cap: **50** (documented as 200; any higher request is silently capped).

---

## Confirmed API behaviour discrepancies

### AUTH
- Login returns `access_token` (docs say `token`)
- `expires_in: 900` = 15 minutes (docs say 86400 = 24 hours)
- `user` object contains only `email` (docs say `{ email, name }`)
- API key must be in `X-API-Key` header (docs say `?api_key=` query param)
- `POST /auth/logout` is stateless: tokens cannot be invalidated server-side (docs say "invalidates the current token server side")
- `POST /auth/refresh` exists and works (not in docs)

### PAGINATION
- `page` parameter is silently ignored; only `offset` works
- Response shape is `{ limit, offset, count, total, has_more, results }` — not `{ total, page, page_size, results }` as documented
- `total` field underreports actual records (see table above)

### MISSING ENDPOINTS
- `/v1/listing/{id}` (singular) → 404; correct path is `/v1/listings/{id}` (plural)
- `/v1/listings/{id}/similar` → 404
- `/v1/analytics/summary` → 404
- `/v1/favourites` (all methods) → 404

### SORTING
- `sort_by` and `order` parameters are silently ignored for all tested values: `price`, `posted_at`, `bedroom`
- Both `order=asc` and `order=desc` return identical sequences

### FILTERS
- `project_id` (undocumented) is silently ignored
- Verified working: `locality`, `bhk`, `furnishing`, `min_price`, `max_price`, `property_type`

### TIMESTAMPS
- `posted_at` has no timezone suffix — bare datetime (e.g. `"2026-08-19T10:52:00"`)
- Server clock is IST (+05:30); timestamps treated as IST-local throughout analysis

### UNITS
- Project `price_min` and `price_max` are **not in rupees** as documented
- Values cluster around 1–6 (crores) and 50–99 (lakhs); nothing in the million-rupee scale
- 184/400 projects have `price_min > price_max` numerically, explained by min in lakhs and max in crores

### COMPLETENESS (UNDOCUMENTED FIELDS)
- Listing records include `is_live` (boolean) — not in docs but critical for Q3
- Rental records also include `is_live` — not in docs

---

## Data quality findings

### Corrupt listings (315 records — cannot exist)
| Type | Count | Example IDs |
|---|---|---|
| Negative price | 5 | `100-6001461`, `ZER-6000669`, `SQU-6003044` |
| Impossibly low positive price (<₹1L) | 6 | `100-6000678` (₹5,030 for 1BHK), `SQU-6000395` (₹17,010 for 4BHK) |
| Floor exceeds total_floors | 6 | `100-6000323`, `DWE-6002846`, `SQU-6001477` |
| Carpet area > super_built_up_area | 4 | `MAG-6001135`, `MAG-6002834`, `ZER-6000468` |
| Carpet area < 150 sqft for 1+ BHK | ~300 | All `MAG-6XXXXXX` source; values (36–149 sqft) consistent with sqm-instead-of-sqft data entry error |

### Duplicates
One physical property is listed twice from different sources:
- `MAG-6000753` (magichomes) and `DWE-6003269` (dwelling) — same name, locality, floor, bedroom, carpet_area, lat/lng

---

## Assignment answers

| # | Key | Value | Confidence |
|---|---|---|---|
| 1 | `total_listing_records` | **3,500** | High — all pages fetched |
| 2 | `unique_properties` | **3,499** | High — 1 duplicate pair found |
| 3 | `active_listings` | **2,792** | High — count of `is_live=true` |
| 4 | `corrupt_listing_ids` | **315 IDs** | High — physical impossibility checks |
| 5 | `total_monthly_rent` | **set from assigned locality** | ― need locality from registration email |
| 6 | `avg_price_per_sqft_2bhk` | **₹14,227.59** | Medium — will change if fake IDs confirmed |
| 7 | `costliest_project` | **P60090, 989,000,000** | Low — project price units ambiguous |
| 8 | `listings_last_7_days` | **129** | Medium — depends on posted_at timezone being IST |
| 9 | `fake_listing_ids` | **[]** | — not determined from API data alone |
| 10 | `projects_with_wrong_listing_count` | **295** | High — compared against full 3500-record dataset |

### Q5 — total_monthly_rent by locality
Sum all rental `price` fields for the assigned locality:

| Locality | Total monthly rent (₹) |
|---|---|
| dwarka expressway | 54,57,800 |
| sector 82 | 52,06,900 |
| new gurgaon | 49,22,000 |
| golf course road | 46,62,400 |
| mg road | 46,12,400 |
| dlf phase 3 | 45,56,900 |
| sector 65 | 44,57,700 |
| sector 56 | 43,40,800 |
| sector 49 | 43,28,000 |
| sohna road | 37,33,800 |

### Q7 uncertainty — project price units
- `P60090` has the highest raw `price_max` value (98.9) in the dataset
- Documented as rupees, but no project has values in the millions
- `price_max_inr` reported as 98.9 × 10,000,000 = 989,000,000 (treating as crores)
- However, P60090's actual listing prices are ₹92.7L–₹2.28Cr, inconsistent with ₹98.9 Cr
- A unit correction approach (values <10 = crores, values >50 = lakhs) gives P60060 as costliest at ₹5.83 Cr

---

## What I checked and found to be correct

- `locality`, `bhk`, `furnishing`, `min_price`, `max_price`, `property_type` filters all work server-side
- `offset`-based pagination is correct and has no record skips or repeats across pages
- `listing_id` values are globally unique (no duplicate IDs across pages)
- Bearer token + X-API-Key header pattern works correctly
- `POST /auth/refresh` with `refresh_token` works as expected
- `/v1/listings/{id}` (plural) correctly returns a single listing
- `/v1/rentals` and `/v1/projects` endpoints work and return valid data
- `has_more` flag reliably indicates whether more pages exist
- Money is in Indian rupees for listings and rentals (as documented)
- Area is in square feet for listings and rentals (as documented, except the ~300 MAG- records entering sqm)
- Pagination `offset` parameter works correctly — no records skipped or repeated
- Rate limit was not encountered (1200 req/min is generous; dataset required ~98 requests)
