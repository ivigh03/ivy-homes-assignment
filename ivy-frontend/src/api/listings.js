import { apiClient } from './client'

// GET /v1/listings

export async function getListings(params = {}) {
  const { data } = await apiClient.get('/v1/listings', { params })
  return data
}

// GET /v1/listings/{listing_id}
export async function getListing(listingId) {
  const { data } = await apiClient.get(`/v1/listings/${listingId}`)
  return data
}

// GET /v1/listings/{listing_id}/similar
export async function getSimilarListings(listingId) {
  const { data } = await apiClient.get(`/v1/listings/${listingId}/similar`)
  return data
}

// Fetch every page using offset-based pagination (docs say "page" — actual uses "offset")
export async function getAllListings(params = {}, limitPerPage = 100) {
  const firstPage = await getListings({ ...params, offset: 0, limit: limitPerPage })
  const total = firstPage.total

  if (!firstPage.has_more) return firstPage.results

  const pages = Math.ceil(total / limitPerPage)
  const requests = []
  for (let i = 1; i < pages; i++) {
    requests.push(getListings({ ...params, offset: i * limitPerPage, limit: limitPerPage }))
  }
  const rest = await Promise.all(requests)
  return [firstPage.results, ...rest.map((r) => r.results)].flat()
}
