/**
 * Delivery Agent (DRIVER) Dashboard Page
 * =======================================
 * Allows delivery drivers to view pending packages, claim deliveries,
 * view routing maps, and simulate real-time vehicle routes.
 */

import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../components/Toast'
import { initSocket, addMessageListener } from '../lib/socket'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const generateMockPOIs = (L, center) => {
  const pois = [
    { type: 'medical', name: 'Zirakpur MedPlus Pharmacy', emoji: '🏥', color: '#ef4444', latOffset: 0.003, lngOffset: -0.004, details: 'Open 24/7 • Prescription drugs & medical supplies' },
    { type: 'grocery', name: 'Super Mart Groceries', emoji: '🛒', color: '#10b981', latOffset: -0.005, lngOffset: 0.006, details: 'Fresh produce, daily essentials, & local dairy' },
    { type: 'mall', name: 'Elante HYPERKART Plaza', emoji: '🛍️', color: '#ec4899', latOffset: 0.007, lngOffset: 0.002, details: 'Multi-brand stores, food court & parking' },
    { type: 'clothing', name: 'Trendz Apparel Boutique', emoji: '👕', color: '#3b82f6', latOffset: -0.002, lngOffset: -0.008, details: 'Latest styles, fabrics, & custom tailoring' },
    { type: 'fruit', name: 'Organic Fruit & Veg Stall', emoji: '🍎', color: '#f59e0b', latOffset: 0.006, lngOffset: -0.005, details: '100% organic farm fresh fruits & juices' },
    { type: 'medical', name: 'Apollo Pharmacy & Wellness', emoji: '🏥', color: '#ef4444', latOffset: -0.006, lngOffset: -0.002, details: 'Medicines, vitamins & health checks' },
    { type: 'grocery', name: 'Fresh Basket Daily Store', emoji: '🛒', color: '#10b981', latOffset: 0.002, lngOffset: 0.008, details: 'Vegetables, snacks & instant deliveries' },
    { type: 'fruit', name: 'Sunny Fruit Market', emoji: '🍎', color: '#f59e0b', latOffset: -0.004, lngOffset: 0.004, details: 'Seasonal mangoes, apples & local berries' }
  ]

  return pois.map(p => {
    const lat = center.lat + p.latOffset
    const lng = center.lng + p.lngOffset

    const icon = L.divIcon({
      className: 'poi-marker',
      html: `<div style="
        width: 28px; height: 28px; 
        background: ${p.color}; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        border: 2px solid white; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); font-size: 12px;">${p.emoji}</span></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    })

    const popupContent = `
      <div style="min-width: 160px; font-family: system-ui, sans-serif;">
        <div style="font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 2px;">${p.name}</div>
        <div style="color: ${p.color}; font-weight: 700; font-size: 10px; margin-bottom: 4px; text-transform: uppercase;">✨ Local POI</div>
        <div style="color: #64748b; font-size: 11px;">${p.details}</div>
      </div>
    `

    return L.marker([lat, lng], { icon }).bindPopup(popupContent)
  })
}

export default function DriverDashboard() {
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()
  const toast = useToast()

  const [tab, setTab] = useState('available')
  const [pendingOrders, setPendingOrders] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [shopCoords, setShopCoords] = useState(null)
  
  // Simulation states
  const [simulating, setSimulating] = useState(false)
  const [simProgress, setSimProgress] = useState(0)
  const [routePoints, setRoutePoints] = useState([]) // OSRM routing coordinate points
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // Leaflet map refs
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const polylineRef = useRef(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Route protection
  useEffect(() => {
    if (!user || (user.role !== 'DRIVER' && user.role !== 'ADMIN')) {
      navigate('/')
    }
  }, [user, navigate])

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true)
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(link)
      document.head.removeChild(script)
    }
  }, [])

  // Load orders
  const loadOrders = async () => {
    try {
      const pendingRes = await api.get('/orders/pending-delivery')
      setPendingOrders(pendingRes.data)
      
      const activeRes = await api.get('/orders/driver/active')
      setActiveOrders(activeRes.data)
      if (activeRes.data.length > 0 && !selectedOrder) {
        setSelectedOrder(activeRes.data[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (user) {
      loadOrders()
    }
  }, [user, tab])

  const [sellerDetails, setSellerDetails] = useState(null)

  // Fetch shop coordinates and load OSRM routing path when active order is selected
  useEffect(() => {
    if (selectedOrder) {
      api.get(`/sellers/${selectedOrder.sellerId}`)
        .then(({ data }) => {
          setSellerDetails(data)
          const coordinates = data.location?.coordinates
          const shopLat = coordinates ? coordinates[1] : 30.665
          const shopLng = coordinates ? coordinates[0] : 76.822
          setShopCoords({ lat: shopLat, lng: shopLng })
          
          const destLat = shopLat + 0.010
          const destLng = shopLng + 0.010

          // Query OSRM routing API to find the real road route
          fetch(`https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`)
            .then((res) => res.json())
            .then((routeData) => {
              if (routeData.routes && routeData.routes.length > 0) {
                const pts = routeData.routes[0].geometry.coordinates.map((c) => [c[1], c[0]])
                setRoutePoints(pts)
              } else {
                setRoutePoints([[shopLat, shopLng], [destLat, destLng]])
              }
            })
            .catch(() => {
              setRoutePoints([[shopLat, shopLng], [destLat, destLng]])
            })
        })
        .catch(() => {
          setSellerDetails(null)
          const shopLat = 30.665
          const shopLng = 76.822
          setShopCoords({ lat: shopLat, lng: shopLng })
          setRoutePoints([[shopLat, shopLng], [shopLat + 0.010, shopLng + 0.010]])
        })
    } else {
      setSellerDetails(null)
      setShopCoords(null)
      setRoutePoints([])
    }
  }, [selectedOrder])

  // Populate initial chat history when selectedOrder changes
  useEffect(() => {
    if (selectedOrder) {
      setChatMessages(selectedOrder.chatMessages || [])
    } else {
      setChatMessages([])
    }
  }, [selectedOrder])

  // Subscribe to WebSocket live chat messages
  useEffect(() => {
    if (!selectedOrder) return
    initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    const off = addMessageListener((msg) => {
      if (msg && msg.type === 'order_chat' && msg.orderId === selectedOrder.id) {
        setChatMessages((prev) => {
          const exists = prev.some((m) => m.timestamp === msg.chatMessage.timestamp && m.senderId === msg.chatMessage.senderId && m.message === msg.chatMessage.message)
          if (exists) return prev
          return [...prev, msg.chatMessage]
        })
      }
    })
    return () => {
      off()
    }
  }, [selectedOrder])

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !selectedOrder) return
    const text = chatInput.trim()
    setChatInput('')
    try {
      await api.post(`/orders/${selectedOrder.id}/chat?message=${encodeURIComponent(text)}`)
    } catch (err) {
      toast('Failed to send message.', 'error')
    }
  }

  // Initialize Route Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !shopCoords || routePoints.length === 0 || mapInstanceRef.current) return
    const L = window.L

    const shopLat = shopCoords.lat
    const shopLng = shopCoords.lng
    const destLat = shopLat + 0.010
    const destLng = shopLng + 0.010

    const map = L.map(mapRef.current, {
      center: [shopLat + 0.005, shopLng + 0.005],
      zoom: 14,
      zoomControl: true,
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)
    mapInstanceRef.current = map

    // Force Leaflet to recalculate container size after DOM is fully painted
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    // Render mock POIs along the delivery route
    const poiMarkers = generateMockPOIs(L, { lat: shopLat, lng: shopLng })
    poiMarkers.forEach(poi => poi.addTo(map))

    // Icons
    const storeIcon = L.divIcon({
      html: `<div style="width:30px;height:30px;background:#6366f1;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏪</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    const destIcon = L.divIcon({
      html: `<div style="width:30px;height:30px;background:#ec4899;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🏠</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    const bikeIcon = L.divIcon({
      html: `<div style="width:34px;height:34px;background:#10b981;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px #10b981, 0 2px 8px rgba(0,0,0,0.4)">🚴</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    })

    L.marker([shopLat, shopLng], { icon: storeIcon }).addTo(map).bindPopup('Store Pickup Point')
    L.marker([destLat, destLng], { icon: destIcon }).addTo(map).bindPopup('Customer Destination')

    const driverMarker = L.marker([shopLat, shopLng], { icon: bikeIcon }).addTo(map)
    driverMarkerRef.current = driverMarker

    const polyline = L.polyline(routePoints, { color: '#a855f7', weight: 4 }).addTo(map)
    polylineRef.current = polyline

    map.fitBounds(routePoints, { padding: [50, 50] })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      driverMarkerRef.current = null
      polylineRef.current = null
    }
  }, [leafletLoaded, shopCoords, routePoints])

  const claimOrder = async (id) => {
    try {
      await api.patch(`/orders/${id}/claim`)
      toast('Package claimed successfully! Active route loaded.', 'success')
      loadOrders()
      setTab('active')
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to claim package.', 'error')
    }
  }

  const simulateRoute = () => {
    if (routePoints.length === 0 || simulating) return
    setSimulating(true)
    setSimProgress(0)

    const totalSteps = routePoints.length
    let step = 0

    const interval = setInterval(async () => {
      if (step >= totalSteps) {
        clearInterval(interval)
        setSimulating(false)
        toast('Reached destination address! Ready to finalize.', 'success')
        return
      }

      const [curLat, curLng] = routePoints[step]

      // Update local marker position
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([curLat, curLng])
      }

      const progress = Math.round(((step + 1) / totalSteps) * 100)
      setSimProgress(progress)

      // Patch coordinate updates to database
      try {
        await api.patch(`/orders/${selectedOrder.id}/driver-location?lat=${curLat}&lng=${curLng}`)
      } catch (err) {
        console.error('Failed patching location update:', err)
      }

      step++
    }, 400) // Fast 400ms steps to traverse the road network smoothly!
  }

  const completeDelivery = async (id) => {
    try {
      await api.patch(`/orders/${id}/deliver`)
      toast('Order delivered successfully! Ledger updated.', 'success')
      setSelectedOrder(null)
      loadOrders()
    } catch (err) {
      toast('Failed to complete delivery.', 'error')
    }
  }
  const [otpInputMap, setOtpInputMap] = useState({})
  const [walletData, setWalletData] = useState(null)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [bankDetails, setBankDetails] = useState('')
  const [payoutSubmitting, setPayoutSubmitting] = useState(false)

  const loadWallet = async () => {
    try {
      const { data } = await api.get('/wallet/driver')
      setWalletData(data)
    } catch (err) {
      console.error('Failed to load driver wallet:', err)
    }
  }

  useEffect(() => {
    if (tab === 'wallet') {
      loadWallet()
    }
  }, [tab])

  const completeDeliveryWithOtp = async (orderId) => {
    const otp = otpInputMap[orderId] || ''
    if (!otp.trim()) {
      toast('Please enter the 4-digit handover OTP code.', 'error')
      return
    }
    try {
      await api.post(`/orders/${orderId}/verify-otp?otp=${encodeURIComponent(otp.trim())}`)
      toast('🎉 Handover OTP Verified! Delivery complete. +$5.00 earned!', 'success')
      setSelectedOrder(null)
      loadOrders()
      if (tab === 'wallet') loadWallet()
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid handover OTP code. Ask customer for 4-digit code.', 'error')
    }
  }

  const handlePayoutSubmit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(payoutAmount)
    if (!amt || amt <= 0) {
      toast('Please enter a valid payout amount.', 'error')
      return
    }
    setPayoutSubmitting(true)
    try {
      await api.post(`/wallet/driver/payout?amount=${amt}&bankDetails=${encodeURIComponent(bankDetails || 'UPI / Bank Transfer')}`)
      toast('Payout request submitted successfully!', 'success')
      setPayoutAmount('')
      setBankDetails('')
      loadWallet()
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit payout request.', 'error')
    } finally {
      setPayoutSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6 font-Outfit">
      {/* Official Delivery Partner Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                VERIFIED DELIVERY PARTNER
              </span>
              <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full font-bold">
                ID: {user?.id?.slice(-6).toUpperCase() || 'DRIVER-01'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
              Welcome, {user?.name || 'Delivery Partner'} 👋
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Your official delivery agent portal: claim nearby packages, follow turn-by-turn route maps, verify 4-digit OTPs, and track daily wallet earnings.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Partner Duty Status</span>
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                🟢 ON DUTY / ONLINE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
        <button
          onClick={() => setTab('available')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'available' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-lg' : 'bg-slate-900 border border-white/5 text-gray-400'}`}
        >
          📦 Available Packages ({pendingOrders.length})
        </button>
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'active' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-lg' : 'bg-slate-900 border border-white/5 text-gray-400'}`}
        >
          🚴 Active Routings ({activeOrders.length})
        </button>
        <button
          onClick={() => setTab('wallet')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'wallet' ? 'bg-emerald-600 border border-emerald-500/20 text-white shadow-lg' : 'bg-slate-900 border border-white/5 text-gray-400'}`}
        >
          💼 Driver Wallet & Earnings (${walletData?.availableBalance?.toFixed(2) || '0.00'})
        </button>
      </div>

      {tab === 'available' && (
        <div className="grid gap-4">
          {pendingOrders.length === 0 && (
            <div className="glass-card p-12 text-center text-gray-500 text-sm font-Outfit">
              No confirmed packages pending delivery at this moment.
            </div>
          )}
          {pendingOrders.map((o) => (
            <div key={o.id} className="glass-card p-6 border border-white/10 hover:border-indigo-500/30 transition-all font-Outfit space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-base text-gray-100">Order #{o.id?.slice(-6).toUpperCase()}</h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    +$5.00 Earning
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Collect: <strong className="text-emerald-400">${o.totalAmount.toFixed(2)}</strong> ({o.paymentMethod})
                </div>
              </div>

              {/* Merchant Pickup & Receiver Drop Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-white/5">
                {/* Step 1: Pickup Merchant */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase tracking-wider">
                    <span>🏪</span> STEP 1: Pickup Merchant
                  </div>
                  <p className="text-sm font-extrabold text-gray-200">{o.sellerName || 'Local Merchant Shop'}</p>
                  <p className="text-xs text-gray-400">📍 Market Square, Zirakpur</p>
                  <div className="pt-1">
                    <a 
                      href={`tel:${o.sellerPhone || '+919876543210'}`} 
                      className="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-extrabold transition-all"
                    >
                      <span>📞</span> Call Seller ({o.sellerPhone || '+91 98765-43210'})
                    </a>
                  </div>
                </div>

                {/* Step 2: Receiver Customer */}
                <div className="space-y-1 md:border-l md:border-white/5 md:pl-4">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <span>📍</span> STEP 2: Customer Delivery
                  </div>
                  <p className="text-sm font-extrabold text-gray-200">{o.buyerName || 'Customer Receiver'}</p>
                  <p className="text-xs text-gray-400">🏠 {o.deliveryAddress}</p>
                  <div className="pt-1">
                    <a 
                      href={`tel:${o.buyerPhone || '+919123456789'}`} 
                      className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-extrabold transition-all"
                    >
                      <span>📞</span> Call Receiver ({o.buyerPhone || '+91 91234-56789'})
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => claimOrder(o.id)}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <span>⚡</span> Claim Package & Start Route
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'active' && (
        <div className="grid gap-6 lg:grid-cols-3 font-Outfit">
          {/* Active List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wide">Claimed Deliveries</h3>
            {activeOrders.length === 0 && (
              <div className="glass-card p-8 text-center text-gray-500 text-xs">
                No claimed active deliveries. Go to packages tab.
              </div>
            )}
            {activeOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className={`glass-card p-4 cursor-pointer hover:border-indigo-500/30 transition-all ${selectedOrder?.id === o.id ? 'border-indigo-500 bg-slate-900/60 ring-1 ring-indigo-500/20' : ''}`}
              >
                <strong className="text-gray-200 text-sm">Order #{o.id?.slice(-6).toUpperCase()}</strong>
                <p className="text-xs text-gray-400 mt-1.5 truncate">📍 {o.deliveryAddress}</p>
                <div className="flex justify-between items-center mt-3 text-[10px] text-indigo-300 font-bold">
                  <span>Method: {o.paymentMethod}</span>
                  <span className="text-pink-400 font-mono">${o.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Tracking Map details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedOrder ? (
              <div className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <h3 className="font-extrabold text-gray-200">Delivery Route: Order #{selectedOrder.id?.slice(-6).toUpperCase()}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Collect Amount: ${selectedOrder.totalAmount?.toFixed(2)} ({selectedOrder.paymentMethod})</p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-black tracking-wide uppercase">
                    {selectedOrder.status}
                  </span>
                </div>

                {/* Swiggy/Zomato Pickup & Delivery Details Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-white/10">
                  {/* Merchant Pickup Point */}
                  <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <span>🏪</span> Pickup Merchant
                      </span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">STEP 1</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-gray-100">{sellerDetails?.businessName || selectedOrder.sellerName || 'Local Merchant Shop'}</h4>
                    <p className="text-xs text-gray-400 leading-snug">📍 {sellerDetails?.address || sellerDetails?.location?.address || 'Sector 4 Market Square, Zirakpur'}</p>
                    <div className="pt-1">
                      <a 
                        href={`tel:${sellerDetails?.phone || '+919876543210'}`} 
                        className="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-extrabold transition-all active:scale-95"
                      >
                        <span>📞</span> Call Seller ({sellerDetails?.phone || '+91 98765-43210'})
                      </a>
                    </div>
                  </div>

                  {/* Customer Delivery Point */}
                  <div className="space-y-1.5 sm:pl-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <span>📍</span> Delivery Receiver
                      </span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">STEP 2</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-gray-100">{selectedOrder.buyerName || 'Customer Receiver'}</h4>
                    <p className="text-xs text-gray-400 leading-snug">🏠 {selectedOrder.deliveryAddress}</p>
                    <div className="pt-1">
                      <a 
                        href={`tel:${selectedOrder.buyerPhone || '+919123456789'}`} 
                        className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-extrabold transition-all active:scale-95"
                      >
                        <span>📞</span> Call Receiver ({selectedOrder.buyerPhone || '+91 91234-56789'})
                      </a>
                    </div>
                  </div>
                </div>

                {/* Leaflet map Container */}
                <div className="leaflet-map-wrapper">
                  {!shopCoords ? (
                    <div className="flex items-center justify-center h-[320px] bg-slate-950/60 text-xs text-gray-500">
                      Loading routing parameters...
                    </div>
                  ) : (
                    <div ref={mapRef} style={{ width: '100%', height: '320px' }} />
                  )}
                </div>

                {/* Simulation Control Pane */}
                <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span>Route Simulation Progress</span>
                    <span className="text-indigo-400 font-mono">{simProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${simProgress}%` }} />
                  </div>

                  <div className="flex flex-col gap-3 pt-1">
                    {/* OTP Input Field for Security Handover */}
                    <div className="bg-slate-900/90 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-black text-emerald-400 block tracking-wider">
                          🔑 Handover 4-Digit Security OTP
                        </label>
                        <span className="text-[10px] text-gray-400">Ask buyer for code shown on their order screen</span>
                      </div>
                      <input
                        type="text"
                        maxLength={4}
                        value={otpInputMap[selectedOrder.id] || ''}
                        onChange={(e) => setOtpInputMap({ ...otpInputMap, [selectedOrder.id]: e.target.value })}
                        placeholder="8492"
                        className="w-20 bg-slate-950 border border-emerald-500/50 text-center text-lg font-mono font-black text-emerald-300 rounded-lg py-1 px-2 tracking-widest focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={simulateRoute}
                        disabled={simulating || simProgress === 100 || !shopCoords}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        🚴 {simulating ? 'Simulating Dispatch...' : simProgress === 100 ? 'Route Completed' : 'Start Dispatch Simulation'}
                      </button>
                      <button
                        onClick={() => completeDeliveryWithOtp(selectedOrder.id)}
                        disabled={simulating || simProgress < 100}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        ✔ Verify OTP & Deliver Package
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customer Chat Message Box */}
                <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-gray-200">💬 Customer Message Box</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>

                  <div className="h-44 overflow-y-auto space-y-2 p-2 bg-slate-900/40 rounded-lg flex flex-col scrollbar-thin">
                    {chatMessages.length === 0 && (
                      <div className="text-center text-[10px] text-gray-500 my-auto">
                        No messages yet. Send a message to start chatting!
                      </div>
                    )}
                    {chatMessages.map((msg, i) => {
                      const isMe = msg.senderId === user.id
                      return (
                        <div
                          key={i}
                          className={`max-w-[75%] p-2 rounded-lg text-xs ${
                            isMe
                              ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                              : 'bg-slate-800 text-gray-200 self-start rounded-tl-none'
                          }`}
                        >
                          <div className="text-[8px] text-gray-400 font-bold mb-0.5">
                            {msg.senderName} ({msg.senderRole})
                          </div>
                          <div className="break-words">{msg.message}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 text-center text-gray-500 text-sm h-[400px] flex items-center justify-center">
                Select a claimed order from the left list to establish routing parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Digital Wallet & Payout Tab */}
      {tab === 'wallet' && (
        <div className="space-y-6">
          {/* Wallet Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 border-l-4 border-emerald-500 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-gray-400">Available Balance</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">
                ${walletData?.availableBalance?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Ready for instant payout withdrawal</span>
            </div>

            <div className="glass-card p-6 border-l-4 border-indigo-500 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-gray-400">Total Delivery Earnings</span>
              <div className="text-3xl font-extrabold font-mono text-indigo-300 mt-2">
                ${walletData?.totalEarnings?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[10px] text-gray-500 mt-1">From {walletData?.completedTrips || 0} completed dispatches</span>
            </div>

            <div className="glass-card p-6 border-l-4 border-purple-500 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-gray-400">Total Withdrawn</span>
              <div className="text-3xl font-extrabold font-mono text-purple-300 mt-2">
                ${walletData?.withdrawn?.toFixed(2) || '0.00'}
              </div>
              <span className="text-[10px] text-gray-500 mt-1">Approved payout transactions</span>
            </div>
          </div>

          {/* Request Payout Form */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>🏦</span> Request Instant Payout Withdrawal
            </h3>
            <form onSubmit={handlePayoutSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={walletData?.availableBalance || 0}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 25.00"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">UPI ID / Bank Details</label>
                <input
                  type="text"
                  required
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="e.g. driver@upi or Bank A/C 9840"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={payoutSubmitting || !walletData?.availableBalance}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                >
                  {payoutSubmitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                </button>
              </div>
            </form>
          </div>

          {/* Completed Trips Ledger */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-gray-200">📜 Completed Trip Earnings History ($5.00 / trip)</h3>
            {!walletData?.history?.length ? (
              <p className="text-xs text-gray-500 text-center py-4">No completed trips in ledger history.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-Outfit">
                  <thead className="bg-slate-950/60 text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Destination</th>
                      <th className="p-3">Base Delivery Fee</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {walletData.history.map((trip) => (
                      <tr key={trip.id} className="hover:bg-white/5">
                        <td className="p-3 font-mono font-bold text-indigo-300">#{trip.id?.slice(-6).toUpperCase()}</td>
                        <td className="p-3 text-gray-300">{trip.deliveryAddress}</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">+${trip.deliveryFee?.toFixed(2) || '5.00'}</td>
                        <td className="p-3"><span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">DELIVERED</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
