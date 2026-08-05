/**
 * Global Redux Store Configuration
 * =================================
 * Configures the single slice reducers for the Redux store state.
 */

import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import cartReducer from './cartSlice'

export const store = configureStore({
  reducer: {
    // Manages buyer and seller authentication sessions
    auth: authReducer,
    // Manages local customer shopping cart items and totals
    cart: cartReducer,
  },
})
