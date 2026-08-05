import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useSelector } from 'react-redux'
import { store } from './store/store'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import Sellers from './pages/Sellers'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import AiSearch from './pages/AiSearch'
import SellerDashboard from './pages/SellerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import Admin from './pages/Admin'
import AdminDashboard from './pages/AdminDashboard'

/**
 * Smart Root Redirect Component
 * =============================
 * Automatically directs logged-in users to their respective portal's home dashboard:
 * - ADMIN -> /admin
 * - SELLER -> /seller-dashboard
 * - DRIVER -> /driver-dashboard
 * - BUYER / Unauthenticated -> /login or /products
 */
function RootRedirect() {
  const { user } = useSelector((s) => s.auth)
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  switch (user.role?.toUpperCase()) {
    case 'ADMIN':
      return <Navigate to="/admin" replace />
    case 'SELLER':
      return <Navigate to="/seller-dashboard" replace />
    case 'DRIVER':
      return <Navigate to="/driver-dashboard" replace />
    default:
      return <Navigate to="/products" replace />
  }
}

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<RootRedirect />} />
              <Route path="home" element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="products" element={<Products />} />
              <Route path="sellers" element={<Sellers />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="ai" element={<AiSearch />} />
              <Route path="seller-dashboard" element={<SellerDashboard />} />
              <Route path="driver-dashboard" element={<DriverDashboard />} />
              <Route path="admin" element={<Admin />} />
              <Route path="admin-dashboard" element={<AdminDashboard />} />
              {/* Catch-all fallback route */}
              <Route path="*" element={<RootRedirect />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  )
}

export default App
