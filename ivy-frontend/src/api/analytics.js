import { apiClient } from './client'

// GET /v1/analytics/summary

export async function getAnalyticsSummary() {
  const { data } = await apiClient.get('/v1/analytics/summary')
  return data
}
