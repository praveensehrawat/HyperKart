/**
 * Global Platform Administrator (ADMIN) Dashboard Page
 * ====================================================
 * Renders platform financial audits, logistics monitors, and merchant approvals tables.
 */

import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../components/Toast'
import { initSocket, addMessageListener } from '../lib/socket'

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()
  const toast = useToast()

  const [pendingSellers, setPendingSellers] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [activeDeliveries, setActiveDeliveries] = useState([])
  const [pendingPayouts, setPendingPayouts] = useState([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingApprovals: 0,
    activeDeliveriesCount: 0,
  })

  // Leaflet map refs
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Protect Admin Route
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
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

  // Load Admin Data
  const loadData = async () => {
    try {
      // Load pending sellers
      const sellersRes = await api.get('/sellers/pending')
      setPendingSellers(sellersRes.data)

      // Load all orders
      const ordersRes = await api.get('/orders/admin/all')
      const orders = ordersRes.data
      setAllOrders(orders)

      // Filter active dispatches
      const active = orders.filter((o) => o.status === 'DISPATCHED')
      setActiveDeliveries(active)

      // Calculate stats
      const paidRev = orders
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + o.totalAmount, 0)

      setStats({
        totalRevenue: paidRev,
        totalOrders: orders.length,
        pendingApprovals: sellersRes.data.length,
        activeDeliveriesCount: active.length,
      })

      // Load pending payouts
      const payoutsRes = await api.get('/wallet/admin/payouts').catch(() => ({ data: [] }))
      setPendingPayouts(payoutsRes.data)
    } catch (err) {
      console.error('Failed loading admin data:', err)
    }
  }

  const approvePayout = async (id) => {
    try {
      await api.patch(`/wallet/admin/payouts/${id}/approve`)
      toast('Payout approved and transferred! 💰', 'success')
      loadData()
    } catch (err) {
      toast('Failed to approve payout.', 'error')
    }
  }

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadData()
    }
  }, [user])

  // Subscribe to live tracking coordinate feeds to update map markers
  useEffect(() => {
    initSocket()
    const off = addMessageListener((msg) => {
      if (msg?.type === 'driver_location') {
        // Update local active deliveries coordinates
        setActiveDeliveries((prev) =>
          prev.map((d) => {
            if (d.id === msg.orderId) {
              return { ...d, driverLat: msg.lat, driverLng: msg.lng }
            }
            return d
          })
        )
      } else if (msg?.type === 'order_notification') {
        // Reload all data if new order comes in or is finalized
        loadData()
      }
    })

    return () => off()
  }, [])

  // Render Logistics Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [30.675, 76.832],
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)
    mapInstanceRef.current = map

    // Force Leaflet to recalculate container size after DOM is fully painted
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [leafletLoaded])

  // Update live map markers for all active deliveries
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return
    const L = window.L
    const map = mapInstanceRef.current

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    // Custom icons
    const bikeIcon = L.divIcon({
      html: `<div style="width:26px;height:26px;background:#10b981;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 0 10px #10b981">🚴</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    })

    // Draw active drivers
    activeDeliveries.forEach((d) => {
      const lat = d.driverLat || 30.665
      const lng = d.driverLng || 76.822

      const marker = L.marker([lat, lng], { icon: bikeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size:11px;">
            <div style="font-weight:bold;color:#1e293b;">Active Driver: Order #${d.id?.slice(-6).toUpperCase()}</div>
            <div style="color:#64748b;margin-top:2px;">Dest: ${d.deliveryAddress}</div>
            <div style="color:#10b981;font-weight:bold;margin-top:4px;">Status: ${d.status}</div>
          </div>
        `)
      markersRef.current.push(marker)
    })

    // Auto fit bounds if drivers exist
    if (activeDeliveries.length > 0) {
      const group = new L.featureGroup(markersRef.current)
      map.fitBounds(group.getBounds().pad(0.2))
    }
  }, [leafletLoaded, activeDeliveries])

  const approveMerchant = async (id) => {
    try {
      await api.patch(`/sellers/${id}/approve`)
      toast('Merchant profile approved successfully! They are now active.', 'success')
      loadData()
    } catch (err) {
      toast('Failed to approve merchant.', 'error')
    }
  }

  if (!user || user.role !== 'ADMIN') return null

  return (
    <div className="space-y-6 font-Outfit">
      <div className="mb-6">
        <span className="text-xs bg-pink-500/15 border border-pink-500/20 text-pink-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          🛡️ Platform Control Console
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Platform Administration</h2>
        <p className="text-gray-400 text-sm font-medium">Verify merchant applications, audit platform logistics runs, and review transactions ledger balances.</p>
      </div>

      {/* Analytics statistics log */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Sales Revenue</span>
          <h3 className="text-2xl font-black text-pink-400 mt-2 font-mono">${stats.totalRevenue.toFixed(2)}</h3>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Processed Orders</span>
          <h3 className="text-2xl font-black text-gray-200 mt-2 font-mono">{stats.totalOrders}</h3>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pending Registrations</span>
          <h3 className="text-2xl font-black text-amber-400 mt-2 font-mono">{stats.pendingApprovals}</h3>
        </div>
        <div className="glass-card p-5">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Logistics Runs</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-2 font-mono">{stats.activeDeliveriesCount}</h3>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Merchant approvals queue */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wide">Approval Requests</h3>
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {pendingSellers.length === 0 && (
              <div className="glass-card p-8 text-center text-gray-500 text-xs">
                No merchant profiles pending approval.
              </div>
            )}
            {pendingSellers.map((seller) => (
              <div key={seller.id} className="glass-card p-4 space-y-3">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-200">{seller.shopName}</h4>
                  <p className="text-[10px] text-indigo-300 font-bold mt-0.5">📞 {seller.phone}</p>
                  <p className="text-[10px] text-gray-500 mt-2 line-clamp-2">{seller.description}</p>
                </div>
                <button
                  onClick={() => approveMerchant(seller.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-2 rounded-xl transition-all cursor-pointer text-center"
                >
                  Approve Merchant
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Global Logistics Monitor Map */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wide">Live Driver Logistics Monitor</h3>
          <div className="glass-card p-4 space-y-4">
            <div className="leaflet-map-wrapper">
              {!leafletLoaded ? (
                <div className="flex items-center justify-center h-[340px] bg-slate-950/60 text-xs text-gray-500">
                  Initializing Live Logistics Map...
                </div>
              ) : (
                <div ref={mapRef} style={{ width: '100%', height: '340px' }} />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>🟢 Auto-refresh active</span>
              <span>Visualizing active driver dispatch tracking feeds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Payout Approvals Ledger */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <span>🏦</span> Pending Driver Payout Approvals ({pendingPayouts.length})
        </h3>
        {pendingPayouts.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No driver payout requests pending review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-Outfit">
              <thead className="bg-slate-950/60 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Requested Amount</th>
                  <th className="p-3">Bank / UPI Details</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-gray-200">{payout.driverName}</td>
                    <td className="p-3 font-mono font-extrabold text-emerald-400">${payout.amount?.toFixed(2)}</td>
                    <td className="p-3 font-mono text-gray-300">{payout.bankDetails}</td>
                    <td className="p-3">
                      <button
                        onClick={() => approvePayout(payout.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        ✔ Approve & Release Funds
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
