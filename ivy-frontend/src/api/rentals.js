import { apiClient } from './client'

// GET /v1/rentals
export async function getRentals(params = {}) {
  const { data } = await apiClient.get('/v1/rentals', { params })
  return data
}

// GET /v1/rentals/{listing_id}
export async function getRental(listingId) {
  const { data } = await apiClient.get(`/v1/rentals/${listingId}`)
  return data
}

// Fetch all rental pages using offset-based pagination
export async function getAllRentals(params = {}, limitPerPage = 100) {
  const firstPage = await getRentals({ ...params, offset: 0, limit: limitPerPage })
  const total = firstPage.total

  if (!firstPage.has_more) return firstPage.results

  const pages = Math.ceil(total / limitPerPage)
  const requests = []
  for (let i = 1; i < pages; i++) {
    requests.push(getRentals({ ...params, offset: i * limitPerPage, limit: limitPerPage }))
  }
  const rest = await Promise.all(requests)
  return [firstPage.results, ...rest.map((r) => r.results)].flat()
}
