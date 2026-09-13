import { apiClient } from './client'

// GET /v1/projects
export async function getProjects(params = {}) {
  const { data } = await apiClient.get('/v1/projects', { params })
  return data
}

// GET /v1/projects/{project_id}
export async function getProject(projectId) {
  const { data } = await apiClient.get(`/v1/projects/${projectId}`)
  return data
}

// Fetch all project pages using offset-based pagination
export async function getAllProjects(params = {}, limitPerPage = 100) {
  const firstPage = await getProjects({ ...params, offset: 0, limit: limitPerPage })
  const total = firstPage.total

  if (!firstPage.has_more) return firstPage.results

  const pages = Math.ceil(total / limitPerPage)
  const requests = []
  for (let i = 1; i < pages; i++) {
    requests.push(getProjects({ ...params, offset: i * limitPerPage, limit: limitPerPage }))
  }
  const rest = await Promise.all(requests)
  return [firstPage.results, ...rest.map((r) => r.results)].flat()
}
