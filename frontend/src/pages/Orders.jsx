/**
 * Order History Page
 * ==================
 * Renders list of orders (incoming orders for sellers; personal purchases for buyers).
 * Subscribes to live WebSocket notifications to display new order updates instantly.
 */

import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { initSocket, addMessageListener } from '../lib/socket'
import PantryReplenisherWidget from '../components/PantryReplenisherWidget'
import { getProductImage } from '../lib/productImages'
import { buildWhatsAppInvoice, buildWhatsAppTracking, openWhatsAppShare } from '../lib/whatsapp'

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
        width: 24px; height: 24px; 
        background: ${p.color}; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        border: 2px solid white; 
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); font-size: 10px;">${p.emoji}</span></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    })

    const popupContent = `
      <div style="min-width: 140px; font-family: system-ui, sans-serif;">
        <div style="font-weight: 800; font-size: 11px; color: #1e293b; margin-bottom: 2px;">${p.name}</div>
        <div style="color: #64748b; font-size: 10px;">${p.details}</div>
      </div>
    `

    return L.marker([lat, lng], { icon }).bindPopup(popupContent)
  })
}

function OrderTrackingMap({ order }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [routePoints, setRoutePoints] = useState([])

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

  // Default coordinates
  const sellerLat = 30.665
  const sellerLng = 76.822
  const destLat = sellerLat + 0.010
  const destLng = sellerLng + 0.010

  // Fetch routing coordinates from OSRM
  useEffect(() => {
    fetch(`https://router.project-osrm.org/route/v1/driving/${sellerLng},${sellerLat};${destLng},${destLat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(routeData => {
        if (routeData.routes && routeData.routes.length > 0) {
          setRoutePoints(routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]))
        } else {
          setRoutePoints([[sellerLat, sellerLng], [destLat, destLng]])
        }
      })
      .catch(() => {
        setRoutePoints([[sellerLat, sellerLng], [destLat, destLng]])
      })
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || routePoints.length === 0 || mapInstanceRef.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [sellerLat + 0.005, sellerLng + 0.005],
      zoom: 14,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)
    mapInstanceRef.current = map

    // Force Leaflet to recalculate container size after DOM is fully painted
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    // Render mock POIs along the delivery route
    const poiMarkers = generateMockPOIs(L, { lat: sellerLat, lng: sellerLng })
    poiMarkers.forEach(poi => poi.addTo(map))

    const storeIcon = L.divIcon({
      html: `<div style="width:24px;height:24px;background:#6366f1;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;">🏪</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const destIcon = L.divIcon({
      html: `<div style="width:24px;height:24px;background:#ec4899;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;">🏠</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const bikeIcon = L.divIcon({
      html: `<div style="width:28px;height:28px;background:#10b981;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 8px #10b981">🚴</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    L.marker([sellerLat, sellerLng], { icon: storeIcon }).addTo(map)
    L.marker([destLat, destLng], { icon: destIcon }).addTo(map)

    const initialDriverLat = order.driverLat || sellerLat
    const initialDriverLng = order.driverLng || sellerLng
    const driverMarker = L.marker([initialDriverLat, initialDriverLng], { icon: bikeIcon }).addTo(map)
    driverMarkerRef.current = driverMarker

    L.polyline(routePoints, { color: '#a855f7', weight: 3 }).addTo(map)

    map.fitBounds(routePoints, { padding: [30, 30] })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      driverMarkerRef.current = null
    }
  }, [leafletLoaded, routePoints])

  // Update driver marker coordinates in real time!
  useEffect(() => {
    if (driverMarkerRef.current && order.driverLat && order.driverLng) {
      driverMarkerRef.current.setLatLng([order.driverLat, order.driverLng])
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([order.driverLat, order.driverLng])
      }
    }
  }, [order.driverLat, order.driverLng])

  return (
    <div className="mt-4 leaflet-map-wrapper">
      <div ref={mapRef} style={{ width: '100%', height: '180px' }} />
      <div className="absolute top-2 left-2 z-10 bg-slate-950/85 border border-white/10 rounded px-2 py-0.5 text-[9px] text-emerald-400 font-bold uppercase animate-pulse">
        🚴 Live Agent Dispatch Routing Active
      </div>
    </div>
  )
}

function OrderChat({ order, userId }) {
  const [messages, setMessages] = useState(order.chatMessages || [])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    setMessages(order.chatMessages || [])
  }, [order.chatMessages])

  useEffect(() => {
    initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    const off = addMessageListener((msg) => {
      if (msg && msg.type === 'order_chat' && msg.orderId === order.id) {
        setMessages((prev) => {
          const exists = prev.some(m => m.timestamp === msg.chatMessage.timestamp && m.senderId === msg.chatMessage.senderId && m.message === msg.chatMessage.message)
          if (exists) return prev
          return [...prev, msg.chatMessage]
        })
      }
    })
    return () => {
      off()
    }
  }, [order.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    try {
      await api.post(`/orders/${order.id}/chat?message=${encodeURIComponent(text)}`)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="mt-4 bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3 font-Outfit">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <span className="text-xs font-bold text-gray-200">💬 Chat with Delivery Agent</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      <div className="h-36 overflow-y-auto space-y-2 p-1 flex flex-col scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-[10px] text-gray-500 my-auto">
            No messages yet. Send a message to guide your driver!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === userId
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
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type message to driver..."
          className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={sendMessage}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()

  const [reviewModalOrder, setReviewModalOrder] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!reviewModalOrder) return
    setReviewSubmitting(true)
    try {
      await api.post('/reviews', {
        orderId: reviewModalOrder.id,
        rating: reviewRating,
        comment: reviewComment,
      })
      alert('Thank you! Your shop review has been submitted. ⭐')
      setReviewModalOrder(null)
      setReviewComment('')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review')
    } finally {
      setReviewSubmitting(false)
    }
  }

  useEffect(() => {
    if (!user) { 
      navigate('/login')
      return 
    }
    
    // Choose endpoint based on user account role
    const endpoint = user.role === 'SELLER' ? '/orders/seller' : '/orders/my'
    api.get(endpoint)
      .then(({ data }) => setOrders(data.content || data))
      .catch(console.error)
      .finally(() => setLoading(false))

    // Subscribe to live order notifications
    initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    const off = addMessageListener((msg) => {
      if (msg?.type === 'order_notification' && msg.order) {
        if (user.role === 'SELLER') {
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === msg.order.id)
            if (exists) {
              return prev.map((o) => o.id === msg.order.id ? msg.order : o)
            }
            return [msg.order, ...prev].slice(0, 50)
          })
        } else if (msg.order.buyerId === user.id) {
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === msg.order.id)
            if (exists) {
              return prev.map((o) => o.id === msg.order.id ? msg.order : o)
            }
            return [msg.order, ...prev].slice(0, 50)
          })
        }
      } else if (msg?.type === 'driver_location') {
        setOrders((prev) => prev.map((o) => {
          if (o.id === msg.orderId) {
            return {
              ...o,
              driverLat: msg.lat,
              driverLng: msg.lng
            }
          }
          return o
        }))
      } else if (msg?.type === 'order_chat') {
        setOrders((prev) => prev.map((o) => {
          if (o.id === msg.orderId) {
            const currentChats = o.chatMessages || []
            const exists = currentChats.some((m) => m.timestamp === msg.chatMessage.timestamp && m.senderId === msg.chatMessage.senderId && m.message === msg.chatMessage.message)
            if (exists) return o
            return {
              ...o,
              chatMessages: [...currentChats, msg.chatMessage]
            }
          }
          return o
        }))
      }
    })

    return () => {
      off()
    }
  }, [user, navigate])

  /**
   * Patches the status of a pending order (Merchant function).
   */
  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status?status=${status}`)
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
    } catch (e) {
      console.error('Failed to update order status:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-indigo-300 font-medium animate-pulse">Retrieving order database...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <span className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          📦 History Log
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
          {user?.role === 'SELLER' ? 'Incoming Merchant Orders' : 'Your Purchases Log'}
        </h2>
        <p className="text-gray-400 text-sm">Real-time synced dispatch history and transactions status tracker</p>
      </div>

      {/* 📦 AI Zero-Touch Pantry Replenisher (for Buyers) */}
      {user?.role !== 'SELLER' && (
        <PantryReplenisherWidget />
      )}

      {orders.length === 0 ? (
        <div className="glass-card p-12 text-center text-gray-500 text-sm">
          No orders registered in history yet.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((o) => {
            const dateStr = new Date(o.createdAt).toLocaleString()
            const isDelivered = o.status === 'DELIVERED' || o.status === 'CONFIRMED'
            const isCancelled = o.status === 'CANCELLED'
            
            const isPaid = o.paymentStatus === 'PAID'
            const payMethodText = o.paymentMethod || 'UNKNOWN'

            return (
              <div key={o.id} className="glass-card p-6 relative overflow-hidden flex flex-col justify-between transition-all hover:border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-gray-100 text-base">Order #{o.id?.slice(-6).toUpperCase()}</p>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold border ${
                        isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {isPaid ? '✔ PAID' : '⌛ UNPAID'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold mt-1 font-mono uppercase">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    <span className="text-[10px] bg-slate-900 border border-white/5 text-indigo-300 font-black px-3 py-1 rounded-lg uppercase tracking-wider font-mono">
                      💳 {payMethodText}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                      isDelivered ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      isCancelled ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      o.status === 'DISPATCHED' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>{o.status}</span>
                  </div>
                </div>
                
                {/* Details snapshot */}
                {o.paymentDetails && (
                  <p className="text-[10.5px] text-indigo-400 bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-500/10 font-medium mt-3">
                    ℹ Payment Details: <span className="font-mono text-gray-300">{o.paymentDetails}</span>
                  </p>
                )}

                {/* 🔑 Handover OTP & QR Code Security Box for Buyers */}
                {user?.role === 'BUYER' && o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* SVG Simulated QR Code */}
                      <div className="w-14 h-14 bg-white p-1.5 rounded-xl shadow-lg flex items-center justify-center shrink-0">
                        <svg className="w-full h-full text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h3v3h-3v-3zm-5-5h3v8h-3v-8z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">Handover Verification OTP</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-extrabold border border-emerald-500/30">SECURE 🔒</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">Show this 4-digit code or QR code to the driver upon delivery</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-indigo-500/40 px-4 py-2 rounded-xl text-center shrink-0 shadow-inner">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Delivery Code</span>
                      <span className="text-2xl font-black font-mono tracking-widest text-emerald-400">{o.deliveryOtp || '8492'}</span>
                    </div>
                  </div>
                )}

                {/* Live tracking map for buyer dispatches */}
                {o.status === 'DISPATCHED' && user?.role === 'BUYER' && (
                  <>
                    <OrderTrackingMap order={o} />
                    <OrderChat order={o} userId={user.id} />
                  </>
                )}

                {/* Ordered items listing */}
                <ul className="mt-4 space-y-2 text-xs text-gray-400 font-medium font-Outfit">
                  {o.items?.map((item, i) => (
                    <li key={i} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10 shadow-sm">
                          <img 
                            src={getProductImage({ name: item.productName })} 
                            alt={item.productName} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div>
                          <span className="text-gray-200 font-bold">{item.productName}</span>
                          <span className="text-indigo-400 font-bold ml-2">x{item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-gray-300">₹{item.unitPrice?.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-white/5 font-Outfit">
                  <div>
                    <span className="text-gray-500 text-xs font-semibold block">Total Amount Paid (incl. 5% GST)</span>
                    <span className="text-[10px] text-indigo-300 font-mono">
                      Subtotal: ₹{((o.totalAmount || 0) / 1.05).toFixed(2)} | GST Tax: ₹{((o.totalAmount || 0) - (o.totalAmount || 0) / 1.05).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-extrabold text-xl text-emerald-400 font-mono">₹{o.totalAmount?.toFixed(2)}</span>
                </div>

                {/* 🌟 Leave Review & GST Tax Invoice Actions for Buyers */}
                {user?.role === 'BUYER' && (
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        const win = window.open('', '_blank')
                        win.document.write(`
                          <html>
                            <head>
                              <title>GST Tax Invoice #${o.id?.slice(-6).toUpperCase()}</title>
                              <style>
                                body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
                                .header { display: flex; justify-content: space-between; border-b: 2px solid #e2e8f0; padding-bottom: 20px; }
                                .badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                                th { background: #f8fafc; }
                                .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #059669; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div>
                                  <h2>HYPERKART COMMERCE GST TAX INVOICE</h2>
                                  <p>Invoice No: <strong>INV-${o.id?.slice(-6).toUpperCase()}</strong></p>
                                  <p>Date: ${new Date(o.createdAt).toLocaleDateString()}</p>
                                  <p>GSTIN: <strong>07AAAAA0000A1Z5</strong> (Registered Local Merchant Marketplace)</p>
                                </div>
                                <div>
                                  <span class="badge">PAID & DELIVERED</span>
                                  <p style="margin-top:10px;">Billed To: ${user.name}</p>
                                  <p>Email: ${user.email}</p>
                                </div>
                              </div>
                              <h3>Itemized Tax & Purchase Breakdown:</h3>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Item Description</th>
                                    <th>Qty</th>
                                    <th>Unit Price (INR)</th>
                                    <th>GST Rate</th>
                                    <th>Tax Amount (CGST 2.5% + SGST 2.5%)</th>
                                    <th>Total (INR ₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${(o.items || []).map(i => `
                                    <tr>
                                      <td>${i.productName}</td>
                                      <td>${i.quantity}</td>
                                      <td>₹${i.unitPrice?.toFixed(2)}</td>
                                      <td>5% GST</td>
                                      <td>₹${((i.unitPrice * i.quantity) * 0.05).toFixed(2)}</td>
                                      <td>₹${(i.unitPrice * i.quantity * 1.05).toFixed(2)}</td>
                                    </tr>
                                  `).join('')}
                                </tbody>
                              </table>
                              <div class="total">Grand Total Paid: ₹${o.totalAmount?.toFixed(2)}</div>
                              <p style="margin-top:30px; font-size:12px; color:#64748b; text-align:center;">This is a computer-generated tax invoice verified under Indian GST Compliance System.</p>
                            </body>
                          </html>
                        `)
                        win.document.close()
                        win.print()
                      }}
                      className="text-xs bg-slate-900 hover:bg-slate-800 border border-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>🧾</span> Download GST Invoice
                    </button>

                    {o.status === 'DELIVERED' && (
                      <button
                        onClick={() => setReviewModalOrder(o)}
                        className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-3 py-1.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>⭐</span> Leave Review
                      </button>
                    )}

                    {/* WhatsApp Action Buttons */}
                    <button
                      type="button"
                      onClick={() => openWhatsAppShare(o.buyerPhone || o.phone || '', buildWhatsAppInvoice(o))}
                      className="text-xs bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-extrabold px-3 py-1.5 rounded-xl hover:bg-[#25D366]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Share Invoice & Bill via WhatsApp"
                    >
                      <span>📲</span> WhatsApp Invoice
                    </button>

                    <button
                      type="button"
                      onClick={() => openWhatsAppShare(o.buyerPhone || o.phone || '', buildWhatsAppTracking(o))}
                      className="text-xs bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-extrabold px-3 py-1.5 rounded-xl hover:bg-[#25D366]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Track Delivery Live on WhatsApp"
                    >
                      <span>💬</span> WhatsApp Tracking
                    </button>
                  </div>
                )}

                {/* Merchant actions for pending orders */}
                {user?.role === 'SELLER' && (
                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/5">
                    {o.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => updateStatus(o.id, 'CONFIRMED')}
                          className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-extrabold hover:bg-indigo-500 transition-all cursor-pointer font-Outfit"
                        >
                          Confirm Order
                        </button>
                        <button 
                          onClick={() => updateStatus(o.id, 'CANCELLED')}
                          className="text-xs border border-white/10 text-gray-400 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer font-Outfit"
                        >
                          Cancel Order
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => openWhatsAppShare(o.buyerPhone || o.phone || '', buildWhatsAppInvoice(o))}
                      className="text-xs bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-extrabold px-3 py-2 rounded-xl hover:bg-[#25D366]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>📲</span> Send WhatsApp Invoice
                    </button>

                    <button
                      type="button"
                      onClick={() => openWhatsAppShare(o.buyerPhone || o.phone || '', buildWhatsAppTracking(o))}
                      className="text-xs bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-extrabold px-3 py-2 rounded-xl hover:bg-[#25D366]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>💬</span> Send WhatsApp Update
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal Dialog */}
      {reviewModalOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 font-Outfit animate-toast-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <span>⭐</span> Rate & Review Store
              </h3>
              <button 
                onClick={() => setReviewModalOrder(null)} 
                className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Select Star Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl cursor-pointer transition-transform hover:scale-125 ${
                        star <= reviewRating ? 'text-amber-400' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-300 text-sm flex items-center">{reviewRating}.0 / 5.0</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Your Feedback & Experience</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us about the item quality, delivery speed, and overall service..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOrder(null)}
                  className="text-xs bg-slate-800 text-gray-300 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-5 py-2.5 rounded-xl hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
