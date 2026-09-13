# Ivy Homes — Software Engineering Internship Assignment

A React + Vite property browsing application built for the **Ivy Homes Software Engineering Internship Assignment (September 2026)**.

The project includes the required frontend features along with a full API audit and dataset investigation to identify discrepancies between the provided documentation and the actual API behavior.

## Features

* Real API authentication with access-token refresh
* Persistent login session
* Property listings with filtering and pagination
* Listing detail pages
* Per-user saved listings
* Rentals browsing
* Projects browsing
* Insights dashboard
* Full dataset extraction and analysis
* API documentation audit
* Data-quality and consistency checks

## Repository Structure

```text
├── submission.json
├── README.md
│
├── data/
│   ├── listings.json
│   ├── rentals.json
│   ├── projects.json
│   └── meta.json
│
├── analysis/
│   ├── answers.json
│   ├── findings.json
│   ├── audit-results.json
│   ├── investigation.json
│   └── audit-summary.md
│
├── scripts/
│   ├── fetch-all.js
│   ├── audit.js
│   ├── analyze.js
│   └── build-outputs.js
│
└── ivy-frontend/
    ├── src/
    │   ├── api/
    │   ├── context/
    │   ├── hooks/
    │   ├── utils/
    │   ├── components/
    │   └── pages/
    ├── .env.example
    ├── package.json
    ├── vercel.json
    └── vite.config.js
```

## Tech Stack

* React 18
* Vite
* JavaScript / JSX
* Axios
* TanStack Query v5
* React Router v6

## Running Locally

### Prerequisites

* Node.js 18+
* npm

### Setup

```bash
cd ivy-frontend
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Add the credentials provided during registration:

```env
VITE_API_BASE_URL=https://solve.ivy.homes
VITE_API_KEY=your_api_key
VITE_DEMO_PASSWORD=your_demo_password
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173`.

Login using one of the demo accounts provided in the registration email.

**Credentials are not committed to the repository.**

## Vercel Deployment

The frontend is contained in `ivy-frontend/`.

For Vercel:

1. Import the repository.
2. Set the **Root Directory** to `ivy-frontend`.
3. Add `VITE_API_KEY` and `VITE_DEMO_PASSWORD` as environment variables.
4. Deploy.

`vercel.json` contains the SPA rewrite required for React Router.

---

# API Investigation

The provided API documentation was treated as a **set of hypotheses**, not as the source of truth.

Each documented behavior was tested against the live API before being relied upon.

### Key findings

* API key authentication requires the `X-API-Key` header rather than the documented query parameter.
* Login returns `access_token` and `refresh_token`, not `token`.
* Access tokens expire after **900 seconds (15 minutes)** rather than 24 hours.
* A refresh endpoint is available.
* Listings use `offset`-based pagination.
* The effective maximum page size is **50**, not 200.
* The documented `page` parameter is ignored.
* `has_more` is required to reliably determine when pagination is complete.
* The documented sorting parameters were found to be ignored.
* `project_id` filtering on listings was found to be ineffective.
* The documented `/v1/listing/{id}` endpoint returns `404`; the working endpoint is `/v1/listings/{id}`.
* `/v1/listings/{id}/similar`, `/v1/analytics/summary`, and `/v1/favourites` were also found to return `404`.
* Listing and rental records contain fields such as `is_live` that were not described in the documentation.
* Listing timestamps do not contain the documented UTC timezone suffix.

All discrepancies included in the final submission were reproduced against the running API.

## Data Investigation

The complete retrievable datasets were downloaded before performing the assignment calculations:

* **3,500** sale listings
* **1,320** rental records
* **400** projects

The analysis includes:

* Listing counts and active listings
* Unique-property analysis
* Corrupt listing detection
* Rental totals
* 2BHK price-per-square-foot analysis
* Costliest project analysis
* Seven-day listing analysis
* Fake/suspicious listing investigation
* Duplicate-property detection
* Project/listing consistency checks
* Unit and data-quality anomalies

Final answers are available in:

```text
submission.json
analysis/answers.json
```

Confirmed discrepancies are available in:

```text
analysis/findings.json
```

## Data Quality Findings

Record-level validation identified several anomalies, including:

* Negative listing prices
* Impossibly low sale prices
* Invalid floor relationships
* Carpet area greater than super-built-up area
* Systematic area-unit anomalies in records from `magichomes`
* Inconsistent project price units

These findings were analyzed separately from potentially fake listings to avoid classifying a data-quality issue as fraud without sufficient evidence.

## What Turned Out to Be Fine

Several hypotheses were tested and rejected:

* Listing IDs are globally unique across the extracted dataset.
* Exact coordinate matching was not sufficient to identify duplicate properties.
* Rental filtering works for the tested supported filters.
* `has_more` provides a reliable pagination termination signal.
* Listing prices are represented in rupees.
* The API extraction completed without rate-limit errors.

## Re-running the Investigation

From the repository root:

```bash
node scripts/fetch-all.js
node scripts/audit.js
node scripts/analyze.js
node scripts/build-outputs.js
```

These scripts respectively:

1. Extract the complete datasets.
2. Test documented API behavior.
3. Calculate the assignment answers.
4. Generate the final analysis outputs.

## What I Would Do With Another Two Days

* Move API-key and token handling behind a backend gateway.
* Improve duplicate detection using fuzzy matching and geographic proximity.
* Perform deeper fake-listing analysis using phone numbers, descriptions and cross-source patterns.
* Expand the Insights dashboard with richer visual analytics.
* Convert the discovered API behaviors into automated regression tests.
* Break the investigation into smaller, more focused commits to make the reasoning easier to follow.

## LLM Usage

LLM tools were used for code generation, debugging, analysis assistance and documentation.

API behavior and data-quality findings were verified against the live API and extracted datasets before being included in the final submission.

---

**Core approach:**

> Treat the documentation as a hypothesis. Treat reproducible API behavior as evidence.
