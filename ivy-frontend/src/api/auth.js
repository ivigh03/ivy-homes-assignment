import { apiClient } from './client'


export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  return data
}


export async function refreshToken(refreshTkn) {
  const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshTkn })
  return data
}


export async function logout() {
  await apiClient.post('/auth/logout')
}
