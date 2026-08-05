/**
 * Redux Toolkit Slice: Shopping Cart Management
 * ============================================
 * Handles customer shopping cart items state, calculates subtotal prices,
 * and synchronizes state locally to localStorage for offline persistence.
 */

import { createSlice } from '@reduxjs/toolkit'

/**
 * Loads cached cart state from localStorage.
 * Falls back to an empty structure if missing or invalid.
 */
const loadCart = () => {
  try {
    const stored = localStorage.getItem('cart')
    return stored ? JSON.parse(stored) : { items: [], savedForLater: [], total: 0 }
  } catch {
    return { items: [], savedForLater: [], total: 0 }
  }
}

/**
 * Persists the current cart state into localStorage.
 */
const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart))
}

const initialState = {
  items: [],
  savedForLater: [],
  total: 0,
  ...loadCart(),
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Adds an item to the shopping cart or increments quantity if already added.
     * Recalculates total price.
     */
    addItem(state, action) {
      const { product, quantity = 1, sellerId } = action.payload
      const existing = state.items.find(
        (item) => item.product.id === product.id && item.sellerId === sellerId
      )
      if (existing) {
        existing.quantity += quantity
      } else {
        state.items.push({ product, quantity, sellerId, addedAt: Date.now() })
      }
      // If item was in savedForLater, remove it from savedForLater
      state.savedForLater = (state.savedForLater || []).filter(
        (i) => !(i.product.id === product.id && i.sellerId === sellerId)
      )
      state.total = state.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
      saveCart(state)
    },
    /**
     * Completely removes a product from the shopping cart.
     * Recalculates total price.
     */
    removeItem(state, action) {
      const { productId, sellerId } = action.payload
      state.items = state.items.filter(
        (item) => !(item.product.id === productId && item.sellerId === sellerId)
      )
      state.total = state.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
      saveCart(state)
    },
    /**
     * Moves an item from active cart to Saved for Later.
     */
    saveForLater(state, action) {
      const { productId, sellerId } = action.payload
      const itemToSave = state.items.find(
        (i) => i.product.id === productId && i.sellerId === sellerId
      )
      if (itemToSave) {
        state.items = state.items.filter(
          (i) => !(i.product.id === productId && i.sellerId === sellerId)
        )
        if (!state.savedForLater) state.savedForLater = []
        const alreadySaved = state.savedForLater.find(
          (i) => i.product.id === productId && i.sellerId === sellerId
        )
        if (!alreadySaved) {
          state.savedForLater.push({ ...itemToSave, savedAt: Date.now() })
        }
        state.total = state.items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        )
        saveCart(state)
      }
    },
    /**
     * Moves an item from Saved for Later back to active shopping cart.
     */
    moveToCart(state, action) {
      const { productId, sellerId } = action.payload
      if (!state.savedForLater) state.savedForLater = []
      const savedItem = state.savedForLater.find(
        (i) => i.product.id === productId && i.sellerId === sellerId
      )
      if (savedItem) {
        state.savedForLater = state.savedForLater.filter(
          (i) => !(i.product.id === productId && i.sellerId === sellerId)
        )
        const existingInCart = state.items.find(
          (i) => i.product.id === productId && i.sellerId === sellerId
        )
        if (existingInCart) {
          existingInCart.quantity += savedItem.quantity || 1
        } else {
          state.items.push({ ...savedItem, quantity: savedItem.quantity || 1 })
        }
        state.total = state.items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        )
        saveCart(state)
      }
    },
    /**
     * Permanently deletes an item from Saved for Later.
     */
    removeSavedItem(state, action) {
      const { productId, sellerId } = action.payload
      if (!state.savedForLater) state.savedForLater = []
      state.savedForLater = state.savedForLater.filter(
        (i) => !(i.product.id === productId && i.sellerId === sellerId)
      )
      saveCart(state)
    },
    /**
     * Explicitly sets a specific item's quantity.
     * Removes the item if set quantity drops to 0.
     * Recalculates total price.
     */
    updateQuantity(state, action) {
      const { productId, sellerId, quantity } = action.payload
      const item = state.items.find(
        (i) => i.product.id === productId && i.sellerId === sellerId
      )
      if (item) {
        item.quantity = Math.max(0, quantity)
        if (item.quantity === 0) {
          state.items = state.items.filter(
            (i) => !(i.product.id === productId && i.sellerId === sellerId)
          )
        }
        state.total = state.items.reduce(
          (sum, i) => sum + i.product.price * i.quantity,
          0
        )
        saveCart(state)
      }
    },
    /**
     * Clears all items and resets totals to zero.
     */
    clearCart(state) {
      state.items = []
      state.total = 0
      saveCart(state)
    },
    /**
     * Integrates incoming server-side cart state updates.
     * Primarily used for WebSocket multi-session synchronizations.
     */
    syncCart(state, action) {
      state.items = action.payload.items || []
      if (action.payload.savedForLater) {
        state.savedForLater = action.payload.savedForLater
      }
      state.total = action.payload.total || 0
      saveCart(state)
    },
    /**
     * Sets the visible notification badge count for the cart item header display.
     */
    setCartBadge(state, action) {
      state.badgeCount = action.payload
    },
  },
})

export const {
  addItem,
  removeItem,
  saveForLater,
  moveToCart,
  removeSavedItem,
  updateQuantity,
  clearCart,
  syncCart,
  setCartBadge,
} = cartSlice.actions

export default cartSlice.reducer