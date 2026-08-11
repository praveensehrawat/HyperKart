/**
 * Global Application Layout Component
 * ===================================
 * Renders the persistent responsive top navigation bar, manages live websocket connection
 * status updates, handles user logout, and dynamically manages admin dashboard link visibility.
 */

import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/authSlice'
import { useEffect, useState, useRef } from 'react'
import { initSocket, addConnectionListener, disconnect, addMessageListener } from '../lib/socket'
import { useToast } from './Toast'
import api from '../api/axios'
import ThemeSelector from './ThemeSelector'
import AiBuyerChatbot from './AiBuyerChatbot'
import SosEmergencyModal from './SosEmergencyModal'
import ParticleBackground from './ParticleBackground'
import ScratchRewardModal from './ScratchRewardModal'
import { soundFx } from '../lib/soundFx'

export default function Layout() {
  const { user } = useSelector((s) => s.auth)
  const location = useLocation()
  
  // Computes the total quantity of items in the cart
  const cartItemCount = useSelector((s) => s.cart.items.reduce((count, item) => count + item.quantity, 0))
  const savedCount = useSelector((s) => (s.cart.savedForLater || []).length)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const [wsConnected, setWsConnected] = useState(false)
  const [runtimeTestAdmin, setRuntimeTestAdmin] = useState(null)
  const [publishedCount, setPublishedCount] = useState(0)
  const [activeFlashDeal, setActiveFlashDeal] = useState(null)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSosModal, setShowSosModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const profileMenuRef = useRef(null)

  // Listen to browser fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const docEl = document.documentElement
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const toast = useToast()

  const handleAiSearchSubmit = (e) => {
    e.preventDefault()
    if (aiSearchQuery.trim()) {
      navigate(`/ai?q=${encodeURIComponent(aiSearchQuery.trim())}`)
      setAiSearchQuery('')
    }
  }

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Web Audio Chime Sound Producer for Instant Order Notifications
  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1) // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {}
  }

  useEffect(() => {
    // Initialize secure websocket live update connection
    initSocket({ 
      onConnect: () => toast('Connected to live updates', 'success') 
    })
    
    // Register listener to update connection status bubble in UI
    const off = addConnectionListener((connected) => setWsConnected(!!connected))

    // Listen for incoming order notifications and trigger interactive toasts
    const offMsg = addMessageListener((msg) => {
      if (msg && msg.type === 'order_notification' && msg.order) {
        const order = msg.order
        playChimeSound()
        if (user && user.role === 'SELLER') {
          toast(`🔔 New Order #${order.id?.slice(-6).toUpperCase()} of $${order.totalAmount?.toFixed(2)} received!`, 'info', 6000)
        } else if (user && order.buyerId === user.id) {
          toast(`🎉 Order Confirmation: Order #${order.id?.slice(-6).toUpperCase()} placed successfully!`, 'success', 6000)
        }
      }
      if (msg && msg.type === 'flash_deal') {
        playChimeSound()
        setActiveFlashDeal(msg)
        toast(`⚡ FLASH SALE: ${msg.shopName} launched "${msg.dealTitle}"!`, 'info', 8000)
      }
    })

    let mounted = true

    // Retrieve runtime test admin configuration email from backend
    api.get('/public/test-admin-email').then(({ data }) => {
      if (mounted) setRuntimeTestAdmin(data.testAdminEmail)
    }).catch(() => {})

    // Retrieve live metric stats for published updates
    api.get('/public/metrics').then(({ data }) => {
      if (mounted) setPublishedCount(data.publishedCount || 0)
    }).catch(() => {})

    // Poll live metric stats every 5 seconds to keep dashboard badge updated
    const pid = setInterval(() => {
      api.get('/public/metrics').then(({ data }) => {
        if (mounted) setPublishedCount(data.publishedCount || 0)
      }).catch(() => {})
    }, 5000)

    return () => { 
      mounted = false
      off() 
      offMsg()
      clearInterval(pid) 
    }
  }, [user])

  /**
   * Attempts to reset and re-establish the live updates socket channel.
   */
  const handleReconnect = () => {
    toast('Reconnecting...', 'info')
    try {
      disconnect()
      initSocket({ url: '/ws', onConnect: () => toast('Reconnected to live updates', 'success') })
    } catch (e) {
      toast('Reconnect failed', 'error')
    }
  }

  /**
   * Signs the current user out and redirects them to the login screen.
   */
  const handleLogout = () => {
    setProfileMenuOpen(false)
    dispatch(logout())
    navigate('/login')
  }


  // Helper to determine active tab class
  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path
    return `px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
      isActive
        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-lg shadow-indigo-500/10'
        : 'text-gray-300 border-transparent hover:border-white/10 hover:bg-white/5 hover:text-white'
    }`
  }

  // Helper for mobile bottom dock active icon class
  const getMobileDockClass = (path) => {
    const isActive = location.pathname === path
    return `flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-all relative ${
      isActive ? 'text-indigo-400 scale-105' : 'text-gray-400 hover:text-gray-200'
    }`
  }

  return (
    <div className="min-h-screen bg-gradient-mesh text-gray-100 pb-20 md:pb-12 font-Outfit">
      {/* ⚡ Real-Time Flash Sale Alert Banner */}
      {activeFlashDeal && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 text-xs font-black flex items-center justify-between shadow-xl font-Outfit animate-pulse relative z-50">
          <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
            <span className="flex items-center gap-2">
              <span className="text-base">⚡</span> 
              <span><strong>{activeFlashDeal.shopName}</strong>: {activeFlashDeal.dealTitle} ({activeFlashDeal.discountPercent}% OFF!)</span>
            </span>
            <button 
              onClick={() => setActiveFlashDeal(null)} 
              className="text-white/80 hover:text-white font-mono font-bold text-sm cursor-pointer ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Interactive Fixed Top Header */}
      <nav className="glass-panel fixed top-0 inset-x-0 z-50 text-white shadow-2xl backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Top Left: Hamburger Button (Mobile Drawer) + Brand Logo */}
          <div className="flex items-center gap-3 pr-2 md:pr-4 border-r border-white/10 flex-shrink-0">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden bg-slate-900/60 hover:bg-slate-800 p-2 rounded-xl border border-white/10 text-white text-base transition-all cursor-pointer"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>

            {/* Helper to calculate brand home link */}
            <Link 
              to={user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'SELLER' ? '/seller-dashboard' : (user.role === 'CAPTAIN' || user.role === 'DRIVER') ? '/driver-dashboard' : '/products') : '/login'} 
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-sm">
                  🏪
                </div>
              </div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 hidden sm:inline">
                HYPERKART
              </span>
            </Link>
          </div>


          {/* Header Interactive AI Search Bar (Available for everyone EXCEPT CAPTAIN) */}
          {user?.role !== 'DRIVER' && user?.role !== 'CAPTAIN' && (
            <form onSubmit={handleAiSearchSubmit} className="hidden lg:flex items-center flex-1 max-w-sm mx-4 relative group font-Outfit">
              <div className="relative w-full">
                <input
                  type="text"
                  value={aiSearchQuery}
                  onChange={(e) => setAiSearchQuery(e.target.value)}
                  placeholder="✨ Ask AI Copilot (e.g. fresh fruits nearby)..."
                  className="w-full bg-slate-950/90 border border-indigo-500/40 focus:border-indigo-400 rounded-xl pl-9 pr-24 py-1.5 text-xs text-gray-100 placeholder-indigo-300/50 outline-none transition-all shadow-inner focus:ring-1 focus:ring-indigo-400/50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs animate-pulse">✨</span>
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-md flex items-center gap-1"
                >
                  <span>AI</span> SEARCH
                </button>
              </div>
            </form>
          )}

          {/* Desktop Navigation Links (Pill Style with Active Glow) */}
          <div className="hidden md:flex items-center gap-1.5 font-Outfit">
            {/* Products & Sellers links available for portals EXCEPT CAPTAIN */}
            {user?.role !== 'DRIVER' && user?.role !== 'CAPTAIN' && (
              <>
                <Link to="/products" className={getNavLinkClass('/products')}>
                  <span>📦</span> Products
                </Link>

                <Link to="/sellers" className={getNavLinkClass('/sellers')}>
                  <span>🏪</span> Sellers
                </Link>
              </>
            )}

            {/* Cart is hidden for CAPTAIN, SELLER, & ADMIN */}
            {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && user?.role !== 'DRIVER' && user?.role !== 'CAPTAIN' && (
              <Link to="/cart" className={`${getNavLinkClass('/cart')} relative`}>
                <span>🛒</span> Cart
                {cartItemCount > 0 && (
                  <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-1 shadow-md animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Delivery Captain Dedicated Link */}
            {(user?.role === 'CAPTAIN' || user?.role === 'DRIVER' || user?.role === 'ADMIN') && (
              <Link to="/driver-dashboard" className={`${getNavLinkClass('/driver-dashboard')} text-emerald-400 font-extrabold`}>
                <span>🚴</span> Captain Portal
              </Link>
            )}

            {user && (
              <Link to="/orders" className={getNavLinkClass('/orders')}>
                <span>📋</span> Orders
              </Link>
            )}

            {user?.role === 'SELLER' && (
              <Link to="/seller-dashboard" className={getNavLinkClass('/seller-dashboard')}>
                <span>📈</span> Dashboard
              </Link>
            )}

            {/* Single Unified Admin Navigation Link */}
            {user && user.role === 'ADMIN' && (
              <Link to="/admin" className={getNavLinkClass('/admin')}>
                <span>🛡️</span> Admin Portal
              </Link>
            )}
          </div>

          {/* Right Section: Theme, Fullscreen, WS Status & User Interactive Dropdown */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/10">

            {/* Zoom Screen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Zoom' : 'Zoom Screen'}
              aria-label="Toggle Fullscreen"
              className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-indigo-300 hover:text-indigo-200 shadow-sm"
            >
              <span className="text-xs">🔍</span>
              <span className="text-[11px] font-extrabold">{isFullscreen ? 'Exit' : 'Zoom'}</span>
            </button>

            {/* Theme Selector */}
            <ThemeSelector />

            {/* WebSocket connection status badge */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-white/10 text-xs shadow-inner">
              {publishedCount > 0 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold" title="Total events published">
                  {publishedCount}
                </span>
              )}
              <span 
                className={`w-2 h-2 rounded-full cursor-pointer ${wsConnected ? 'bg-emerald-400 pulse-indicator-active' : 'bg-rose-400'}`} 
                onClick={handleReconnect}
                title={wsConnected ? 'Connected to live updates' : 'Offline. Click to reconnect.'}
                aria-hidden="true" 
              />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{wsConnected ? 'Live' : 'Off'}</span>
            </div>
            
            {/* User Profile / Auth Interactive Dropdown */}
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black shadow-md">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-gray-200 text-xs font-bold leading-none">{user.name}</span>
                    <span className="text-[9px] text-indigo-400 font-extrabold uppercase leading-tight">{user.role || 'USER'}</span>
                  </div>
                  <span className="text-gray-400 text-[10px] ml-1">▼</span>
                </button>

                {/* Profile Floating Menu Dropdown */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-50 font-Outfit animate-toast-in">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-xs font-bold text-gray-200">{user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-extrabold uppercase">
                        {user.role} Account
                      </span>
                    </div>

                    <div className="py-1 space-y-0.5 text-xs">
                      <Link 
                        to="/orders" 
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-semibold transition-colors"
                      >
                        <span>📋 My Orders</span>
                        <span className="text-[10px] text-gray-500">→</span>
                      </Link>

                      {user?.role !== 'DRIVER' && user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
                        <Link 
                          to="/cart" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 font-semibold transition-colors"
                        >
                          <span>🔖 Saved for Later</span>
                          {savedCount > 0 && (
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-bold">
                              {savedCount}
                            </span>
                          )}
                        </Link>
                      )}

                      {user.role === 'SELLER' && (
                        <Link 
                          to="/seller-dashboard" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 font-bold transition-colors"
                        >
                          <span>📈 Merchant Dashboard</span>
                          <span className="text-[10px]">→</span>
                        </Link>
                      )}

                      {(user.role === 'CAPTAIN' || user.role === 'DRIVER' || user.role === 'ADMIN') && (
                        <Link 
                          to="/driver-dashboard" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 font-bold transition-colors"
                        >
                          <span>🚴 Captain Portal</span>
                          <span className="text-[10px]">→</span>
                        </Link>
                      )}

                      {user.role === 'ADMIN' && (
                        <Link 
                          to="/admin-dashboard" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-pink-400 hover:bg-pink-500/10 font-bold transition-colors"
                        >
                          <span>🛡️ Admin Console</span>
                          <span className="text-[10px]">→</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setProfileMenuOpen(false)
                          soundFx.playHapticClick()
                          setShowSosModal(true)
                        }}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold transition-colors cursor-pointer"
                      >
                        <span>🔴 10-Min Emergency SOS</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1 py-0.2 rounded font-extrabold">SOS</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-white/10">
                      <button 
                        onClick={handleLogout} 
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-colors cursor-pointer"
                      >
                        <span>🚪 Logout Account</span>
                        <span className="text-[10px]">✕</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-neon text-white px-3.5 py-1.5 rounded-xl font-extrabold transition-all text-xs">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Bar: Fullscreen Zoom, Cart & Theme Selector */}
          <div className="flex md:hidden items-center gap-2">
            {/* Full Screen / Zoom Toggle Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen Zoom' : 'Full Screen Zoom Mode'}
              aria-label="Toggle Fullscreen Zoom Mode"
              className="bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-md active:scale-95"
            >
              <span className="text-sm">🔍</span>
              <span className="text-[10px] font-black">{isFullscreen ? 'Exit' : 'Zoom'}</span>
            </button>

            {user?.role !== 'DRIVER' && user?.role !== 'SELLER' && (
              <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="relative text-gray-300 p-2 bg-slate-900/90 rounded-xl border border-white/10 flex items-center justify-center">
                🛒
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-extrabold shadow-sm">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )}
            <ThemeSelector showLabel={false} />
            <span 
              className={`w-2.5 h-2.5 rounded-full cursor-pointer relative ${wsConnected ? 'bg-emerald-400 pulse-indicator-active' : 'bg-rose-400'}`} 
              onClick={handleReconnect}
              title={wsConnected ? 'Live' : 'Offline'}
            />
          </div>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3 font-Outfit text-sm animate-toast-in">
            <div className="flex flex-col space-y-2">
              {/* Show catalog & search links for everyone EXCEPT DRIVER */}
              {user?.role !== 'DRIVER' && (
                <>
                  <Link 
                    to="/products" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-200 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 font-semibold flex items-center justify-between"
                  >
                    <span>📦 Products Directory</span>
                    <span className="text-xs text-gray-500">→</span>
                  </Link>
                  <Link 
                    to="/sellers" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-200 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 font-semibold flex items-center justify-between"
                  >
                    <span>🏪 Local Merchants</span>
                    <span className="text-xs text-gray-500">→</span>
                  </Link>
                  <Link 
                    to="/ai" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-indigo-400 hover:text-indigo-300 py-2 px-3 rounded-lg hover:bg-white/5 font-bold flex items-center justify-between"
                  >
                    <span>✨ AI Smart Search & Voice Copilot</span>
                    <span className="text-xs text-indigo-400">→</span>
                  </Link>
                  {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && (
                    <Link 
                      to="/cart" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-gray-200 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 font-semibold flex items-center justify-between"
                    >
                      <span>🛒 Shopping Cart ({cartItemCount})</span>
                      <span className="text-xs text-gray-500">→</span>
                    </Link>
                  )}
                </>
              )}
              
              {user?.role === 'SELLER' && (
                <Link 
                  to="/seller-dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-emerald-400 hover:text-emerald-300 py-2 px-3 rounded-lg hover:bg-white/5 font-bold flex items-center justify-between"
                >
                  <span>📈 Merchant Dashboard</span>
                  <span className="text-xs text-emerald-400">→</span>
                </Link>
              )}

              {(user?.role === 'DRIVER' || user?.role === 'ADMIN') && (
                <Link 
                  to="/driver-dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-emerald-400 hover:text-emerald-300 py-2 px-3 rounded-lg hover:bg-white/5 font-bold flex items-center justify-between"
                >
                  <span>🚴 Delivery Logistics Portal</span>
                  <span className="text-xs text-emerald-400">→</span>
                </Link>
              )}

              {user && (
                <Link 
                  to="/orders" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-200 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 font-semibold flex items-center justify-between"
                >
                  <span>📋 My Order History</span>
                  <span className="text-xs text-gray-500">→</span>
                </Link>
              )}

              {user?.role === 'ADMIN' && (
                <Link 
                  to="/admin-dashboard" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-pink-400 hover:text-pink-300 py-2 px-3 rounded-lg hover:bg-white/5 font-bold flex items-center justify-between"
                >
                  <span>🛡️ System Administration</span>
                  <span className="text-xs text-pink-400">→</span>
                </Link>
              )}

              {/* 🔴 10-MIN SOS EMERGENCY DISPATCH ITEM IN HAMBURGER MENU */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  soundFx.playHapticClick()
                  setShowSosModal(true)
                }}
                className="w-full text-left text-rose-400 hover:text-rose-300 py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 font-extrabold flex items-center justify-between cursor-pointer"
              >
                <span>🔴 10-Min Emergency Rapid SOS</span>
                <span className="text-xs text-rose-400 font-mono font-black animate-pulse">TRIGGER →</span>
              </button>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              {user ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">Logged in as</span>
                    <span className="text-sm font-bold text-indigo-300">{user.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      handleLogout()
                      setMobileMenuOpen(false)
                    }} 
                    className="bg-rose-600/80 border border-rose-500/30 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-600 cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center bg-slate-900 border border-white/10 text-gray-200 py-2 rounded-xl text-xs font-bold"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center btn-neon text-white py-2 rounded-xl text-xs font-bold"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Page Body Content Container */}
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* 📱 Mobile App Fixed Bottom App Dock (Role-Aware Navigation Bar) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-slate-950/95 border-t border-white/10 backdrop-blur-2xl px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.6)] flex items-center justify-around font-Outfit">
        {user?.role === 'DRIVER' ? (
          <>
            <Link to="/driver-dashboard" className={getMobileDockClass('/driver-dashboard')}>
              <span className="text-base">🚴</span>
              <span className="text-emerald-400 font-bold">Delivery</span>
            </Link>

            <Link to="/orders" className={getMobileDockClass('/orders')}>
              <span className="text-base">📋</span>
              <span>Orders</span>
            </Link>

            <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold text-rose-400 cursor-pointer">
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </>
        ) : user?.role === 'SELLER' ? (
          <>
            <Link to="/" className={getMobileDockClass('/')}>
              <span className="text-base">🏠</span>
              <span>Home</span>
            </Link>

            <Link to="/products" className={getMobileDockClass('/products')}>
              <span className="text-base">📦</span>
              <span>Products</span>
            </Link>

            <Link to="/seller-dashboard" className={getMobileDockClass('/seller-dashboard')}>
              <span className="text-base">📈</span>
              <span className="text-emerald-400 font-bold">Dashboard</span>
            </Link>

            <Link to="/orders" className={getMobileDockClass('/orders')}>
              <span className="text-base">📋</span>
              <span>Orders</span>
            </Link>

            <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold text-rose-400 cursor-pointer">
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </>
        ) : user?.role === 'ADMIN' ? (
          <>
            <Link to="/admin" className={getMobileDockClass('/admin')}>
              <span className="text-base">🛡️</span>
              <span className="text-pink-400 font-bold">Admin</span>
            </Link>

            <Link to="/driver-dashboard" className={getMobileDockClass('/driver-dashboard')}>
              <span className="text-base">🚴</span>
              <span>Logistics</span>
            </Link>

            <Link to="/orders" className={getMobileDockClass('/orders')}>
              <span className="text-base">📋</span>
              <span>Orders</span>
            </Link>

            <button onClick={handleLogout} className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold text-rose-400 cursor-pointer">
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/" className={getMobileDockClass('/')}>
              <span className="text-base">🏠</span>
              <span>Home</span>
            </Link>

            <Link to="/products" className={getMobileDockClass('/products')}>
              <span className="text-base">📦</span>
              <span>Products</span>
            </Link>

            <Link to="/ai" className={getMobileDockClass('/ai')}>
              <span className="text-base">✨</span>
              <span className="text-indigo-400 font-bold">AI Voice</span>
            </Link>

            <Link to="/cart" className={getMobileDockClass('/cart')}>
              <div className="relative">
                <span className="text-base">🛒</span>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-extrabold animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </Link>

            {user ? (
              <Link to="/orders" className={getMobileDockClass('/orders')}>
                <span className="text-base">📋</span>
                <span>Orders</span>
              </Link>
            ) : (
              <Link to="/login" className={getMobileDockClass('/login')}>
                <span className="text-base">👤</span>
                <span>Login</span>
              </Link>
            )}
          </>
        )}
      </div>

      {/* Ambient Interactive Canvas Particle Background */}
      <ParticleBackground />



      {/* Minimized Floating Scratch & Win Badge (Bottom-Left: Compact mini icon button) */}
      <div className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-40 font-Outfit">
        <button
          onClick={() => {
            soundFx.playHapticClick()
            setShowRewardModal(true)
          }}
          title="Scratch & Win HYPERKART Cashback & Rewards"
          className="bg-slate-900/90 hover:bg-slate-800 border border-amber-500/50 text-amber-300 px-2.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xl hover:scale-110 active:scale-95 backdrop-blur-md ring-2 ring-amber-500/20"
        >
          <span className="text-sm animate-bounce">🎁</span>
          <span className="text-[10px] font-black uppercase tracking-wider">Rewards</span>
        </button>
      </div>

      {/* Floating Glassmorphism AI Assistant Widget (Available for buyers & guests) */}
      {user?.role !== 'DRIVER' && user?.role !== 'ADMIN' && (
        <AiBuyerChatbot />
      )}

      {/* 🔴 RED ALERT 10-MIN SOS Emergency Dispatch Modal */}
      {showSosModal && (
        <SosEmergencyModal onClose={() => setShowSosModal(false)} />
      )}

      {/* 🎁 Gamified Scratch & Win Cashback Rewards Modal */}
      {showRewardModal && (
        <ScratchRewardModal
          sourceTrigger="HYPERKART Action Bonus"
          onClose={() => setShowRewardModal(false)}
        />
      )}
    </div>
  )
}
