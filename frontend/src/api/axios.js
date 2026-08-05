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
 * - Prioritizes VITE_API_URL if provided in environment configuration
 * - In Vite dev mode (port 5173): use proxy path '/api'
 * - On local dev network: use host with port 8090
 * - On production web hosts (e.g. InfinityFree): fallback to relative '/api' or VITE_API_URL
 */
function getApiBaseURL() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  if (window.location.port === '5173') return '/api'
  const host = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  // If accessing locally or via LAN IP on mobile Wi-Fi (e.g. 172.22.x.x, 192.168.x.x, 10.x.x.x)
  if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return `${protocol}//${host}:8085/api`
  }
  return '/api'
}

const api = axios.create({
  baseURL: getApiBaseURL(),
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

// Response Interceptor: Catch authorization failures (expired/invalid token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear invalid credentials and redirect to Login page
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.hash.includes('login')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
