import { apiClient } from './client'

// GET /v1/favourites — requires Authorization header

export async function getFavourites() {
  const { data } = await apiClient.get('/v1/favourites')
  return data
}

// POST /v1/favourites — body: { id: listing_id }

export async function addFavourite(listingId) {
  const { data } = await apiClient.post('/v1/favourites', { listing_id: listingId })
  return data
}

// DELETE /v1/favourites/{id}
export async function removeFavourite(listingId) {
  const { data } = await apiClient.delete(`/v1/favourites/${listingId}`)
  return data
}
