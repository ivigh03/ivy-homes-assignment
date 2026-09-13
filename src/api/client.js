import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://solve.ivy.homes'
const API_KEY = import.meta.env.VITE_API_KEY || ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  config.headers['X-API-Key'] = API_KEY

  const token = localStorage.getItem('ivy_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})


let isRefreshing = false
let refreshQueue = []

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  refreshQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Attempt silent refresh on 401, but not for auth endpoints themselves
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url?.startsWith('/auth/')
    ) {
      original._retried = true
      const refreshTkn = localStorage.getItem('ivy_refresh_token')

      if (!refreshTkn) {
        localStorage.removeItem('ivy_token')
        localStorage.removeItem('ivy_refresh_token')
        localStorage.removeItem('ivy_user')
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }

      isRefreshing = true
      try {
        const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshTkn })
        const newToken = data.access_token
        localStorage.setItem('ivy_token', newToken)
        if (data.refresh_token) localStorage.setItem('ivy_refresh_token', data.refresh_token)
        processQueue(null, newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      } catch (refreshError) {
        processQueue(refreshError)
        localStorage.removeItem('ivy_token')
        localStorage.removeItem('ivy_refresh_token')
        localStorage.removeItem('ivy_user')
        window.dispatchEvent(new Event('ivy:auth:expired'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
