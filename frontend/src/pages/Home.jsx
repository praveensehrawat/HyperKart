/**
 * HYPERKART Marketplace Home Landing Page
 * ========================================
 * Landing dashboard introducing nearby seller mapping, smart AI-driven searches,
 * and live socket-based product stock update listener triggers.
 */

import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { initSocket, addMessageListener } from '../lib/socket'
import { useToast } from '../components/Toast'
import GroupBuyingWidget from '../components/GroupBuyingWidget'

export default function Home() {
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()
  const addToast = useToast()

  // Auto-redirect Delivery Partners & Merchants directly to their dedicated Dashboards
  useEffect(() => {
    if (user && user.role === 'DRIVER') {
      navigate('/driver-dashboard')
    } else if (user && user.role === 'SELLER') {
      navigate('/seller-dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    // Connect to WebSocket channel
    initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    
    // Subscribe to product stock change announcements
    const off = addMessageListener((msg) => {
      if (msg?.type === 'product_update') {
        addToast && addToast(`Live: ${msg.name || msg.productId} stock updated to ${msg.stock}`, 'info')
      }
    })
    return () => off()
  }, [])

  return (
    <div className="py-12 px-4 relative">
      {/* Decorative background glow elements */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="text-center max-w-4xl mx-auto">
        <span className="bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-wider mb-6 inline-block animate-pulse">
          ⚡ HYPERKART v2.0 Platform
        </span>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gradient animate-float-slow leading-tight">
          Shop Local.<br />Deliver Instant.
        </h1>
        
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Experience AI-powered HYPERKART commerce. Instantly discover nearby merchant listings, leverage neural smart search recommendation models, and monitor real-time stock dynamics.
        </p>
        
        {/* Dynamic landing navigation actions */}
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <Link to="/products" className="btn-neon text-white px-8 py-3.5 rounded-xl font-bold transition-all text-sm">
            Browse Catalog
          </Link>
          <Link to="/ai" className="bg-slate-900/60 border border-indigo-500/30 text-indigo-300 px-8 py-3.5 rounded-xl font-bold hover:bg-slate-900 hover:border-indigo-400 transition-all text-sm flex items-center gap-2">
            ✨ Neural Smart Search
          </Link>
          {!user && (
            <Link to="/register" className="bg-emerald-600/90 border border-emerald-500/30 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-emerald-600 hover:scale-105 transition-all text-sm">
              Get Started
            </Link>
          )}
        </div>
      </div>

      {/* 👥 Active Neighborhood Group Buying Deals Section */}
      <div className="max-w-5xl mx-auto mt-12">
        <GroupBuyingWidget />
      </div>

      {/* Feature cards highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
        {[
          { 
            title: 'Geo-Proximity Maps', 
            desc: 'Pinpoint and search verified local merchant shops located within direct kilometer ranges using real-time geolocation overlays.', 
            link: '/sellers',
            icon: '📍',
            color: 'from-emerald-400 to-teal-400'
          },
          { 
            title: 'Smart Neural Scoring', 
            desc: 'Our Fast-API scoring service processes your coordinates and checkout history to compile hyper-personalized recommendations.', 
            link: '/ai',
            icon: '🧠',
            color: 'from-indigo-400 to-purple-400'
          },
          { 
            title: 'Live Inventory Sync', 
            desc: 'Stay informed with direct WebSockets broadcasting merchant inventory stock updates instantly to your browser view.', 
            link: '/orders',
            icon: '⏱️',
            color: 'from-pink-400 to-rose-400'
          },
        ].map((f) => (
          <Link key={f.title} to={f.link} className="glass-card p-8 rounded-2xl relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />
            <div>
              <span className="text-3xl mb-4 block">{f.icon}</span>
              <h3 className={`font-extrabold text-xl mb-3 bg-gradient-to-r ${f.color} bg-clip-text text-transparent`}>
                {f.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
            <div className="mt-6 flex items-center text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              Explore Now <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
