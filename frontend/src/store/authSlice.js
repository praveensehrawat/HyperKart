/**
 * Redux Toolkit Slice: User Authentication
 * ========================================
 * Handles JWT token and user session state storage, caching session data
 * in browser localStorage for persistence across reloads.
 */

import { createSlice } from '@reduxjs/toolkit'

// Safely retrieve cached user session from localStorage
const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch (e) {
    console.error('Failed to parse cached user data from localStorage:', e)
    localStorage.removeItem('user')
    return null
  }
}

const initialState = {
  token: localStorage.getItem('token') || null,
  user: getStoredUser(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Stores successful authentication credentials in both Redux state and localStorage.
     */
    setAuth(state, action) {
      state.token = action.payload.token
      state.user = action.payload
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    /**
     * Clears authentication credentials on session logout or expiry.
     */
    logout(state) {
      state.token = null
      state.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    /**
     * Updates partial fields of the authenticated user's profile (e.g. seller shop info updates).
     */
    updateUser(state, action) {
      const updatedUser = { ...state.user, ...action.payload }
      state.user = updatedUser
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  },
})

export const { setAuth, logout, updateUser } = authSlice.actions
export default authSlice.reducer
