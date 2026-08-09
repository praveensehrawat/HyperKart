/**
 * Axios HTTP API Client Instance
 * ==============================
 * Configures base URL path, default content types, request header auth token
 * injections, and global 401 response handling to force logout expired sessions.
 */

import axios from 'axios'

/**
 * Dynamically resolve the backend API base URL.
 * - In Vite dev mode (port 5173): use proxy path '/api'
 * - In production (XAMPP): use current browser hostname with backend port 8090
 *   This allows mobile devices on the same WiFi to connect.
 */
/**
 * Dynamically resolve the backend API base URL.
 * - Prioritizes VITE_API_BASE_URL or VITE_API_URL environment variables
 * - In Vite dev mode (port 5173): use proxy path '/api'
 * - On local dev network: use host with port 8085
 * - On production hosts (Vercel): fallback to live Render backend URL
 */
function getApiBaseURL() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  if (envUrl && envUrl.trim()) {
    let cleanUrl = envUrl.trim()
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = cleanUrl.replace(/\/+$/, '') + '/api'
    }
    return cleanUrl
  }
  if (window.location.port === '5173') return '/api'
  const host = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return `${protocol}//${host}:8085/api`
  }
  // Production fallback to live Render backend
  return 'https://hyperkart-backend.onrender.com/api'
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 60000, // 60 seconds to support Render free tier cold starts
  headers: { 'Content-Type': 'application/json' },
})

// Request Interceptor: Inject JWT Token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor: Handle network cold starts, 502 Bad Gateway, and authorization failures
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config
    if (!config) return Promise.reject(err)

    // Track retry count on config object
    config._retryCount = config._retryCount || 0

    const isNetworkOr502Error =
      err.message === 'Network Error' ||
      err.code === 'ECONNABORTED' ||
      err.response?.status === 502 ||
      err.response?.status === 503 ||
      err.response?.status === 504

    if (isNetworkOr502Error && config._retryCount < 3) {
      config._retryCount += 1
      const backoffDelay = config._retryCount * 2500 // 2.5s, 5.0s, 7.5s
      await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      return api(config)
    }

    if (err.response?.status === 401) {
      // Clear invalid credentials and redirect to Login page
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
