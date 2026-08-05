/**
 * Leaflet + OpenStreetMap Seller Geolocation Component
 * ====================================================
 * Renders nearby sellers on an interactive map using Leaflet and OpenStreetMap tiles.
 * No API key required — completely free and open-source.
 */

import { useEffect, useRef, useState } from 'react'

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

export default function SellerMap({ sellers = [], center, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [selected, setSelected] = useState(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Dynamically load Leaflet CSS and JS (persistently)
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true)
      return
    }

    let script = document.getElementById('leaflet-js')
    if (!script) {
      script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      document.head.appendChild(script)
    }

    const checkL = () => {
      if (window.L) {
        setLeafletLoaded(true)
      } else {
        setTimeout(checkL, 50)
      }
    }

    if (window.L) {
      setLeafletLoaded(true)
    } else {
      script.addEventListener('load', checkL)
      checkL()
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
  }, [])

  // Parse sellers into markers
  const markers = sellers.map((s) => {
    const seller = s.seller || s
    const loc = seller.location
    return {
      id: seller.id,
      name: seller.shopName,
      address: seller.address,
      description: seller.description,
      distanceKm: s.distanceKm,
      lat: loc?.coordinates?.[1] ?? loc?.y ?? 0,
      lng: loc?.coordinates?.[0] ?? loc?.x ?? 0,
    }
  }).filter((m) => m.lat && m.lng)

  // Default center (New Delhi)
  const mapCenter = center || (markers.length
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: 28.6139, lng: 77.209 })

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)
    mapInstanceRef.current = map

    // Force Leaflet to recalculate container size after DOM is fully painted
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [leafletLoaded])

  // Update markers when sellers change
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return
    const L = window.L
    const map = mapInstanceRef.current

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    // Custom marker icon
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px; height: 32px; 
        background: linear-gradient(135deg, #6366f1, #a855f7); 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        border: 3px solid white; 
        box-shadow: 0 4px 12px rgba(99,102,241,0.5);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); font-size: 14px;">🏪</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    })

    // Add mock POIs all around the center location
    const poiMarkers = generateMockPOIs(L, mapCenter)
    poiMarkers.forEach(poi => {
      poi.addTo(map)
      markersRef.current.push(poi)
    })

    // User location marker
    if (center) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="
          width: 18px; height: 18px;
          background: #3b82f6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      const userMarker = L.marker([center.lat, center.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div style="text-align:center;font-weight:bold;color:#3b82f6;">📍 Your Location</div>')
      markersRef.current.push(userMarker)
    }

    // Seller markers
    markers.forEach((m) => {
      const popupContent = `
        <div style="min-width: 190px; font-family: system-ui, sans-serif; padding: 2px;">
          <div style="font-weight: 800; font-size: 14px; color: #1e293b; margin-bottom: 2px;">${m.name}</div>
          ${m.distanceKm != null ? `<div style="color: #6366f1; font-weight: 700; font-size: 12px; margin-bottom: 4px;">⚡ ${m.distanceKm.toFixed(2)} km away</div>` : ''}
          <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">📍 ${m.address || 'Local Merchant Counter'}</div>
          <a href="#/products?sellerId=${m.id}" style="display: block; text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 7px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 12px rgba(99,102,241,0.35);">
            🛍️ Browse Shop Catalog →
          </a>
        </div>
      `

      const marker = L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindPopup(popupContent)

      marker.on('click', () => {
        setSelected(m)
        onSelect?.(m)
      })

      markersRef.current.push(marker)
    })

    // Fit map bounds to show all markers
    if (markers.length > 0) {
      const allPoints = markers.map((m) => [m.lat, m.lng])
      if (center) allPoints.push([center.lat, center.lng])
      map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 14 })
    } else if (center) {
      map.setView([center.lat, center.lng], 13)
    }
  }, [leafletLoaded, sellers, center])

  // Invalidate map container size whenever center or loaded state changes to prevent blank tiles in modals
  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 150)
    return () => clearTimeout(timer)
  }, [leafletLoaded, center])

  // Update center and open marker popup with smooth camera flyTo when center changes
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return
    const map = mapInstanceRef.current
    map.invalidateSize()
    map.flyTo([center.lat, center.lng], 16, { animate: true, duration: 1.2 })
    
    // Find matching marker and open its popup automatically after camera pan
    const targetMarker = markersRef.current.find((m) => {
      if (!m.getLatLng) return false
      const pos = m.getLatLng()
      return Math.abs(pos.lat - center.lat) < 0.0005 && Math.abs(pos.lng - center.lng) < 0.0005
    })
    if (targetMarker && targetMarker.openPopup) {
      setTimeout(() => targetMarker.openPopup(), 400)
    }
  }, [center])

  if (!leafletLoaded) {
    return (
      <div className="flex items-center justify-center h-96 rounded-xl bg-slate-950/50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm font-medium">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaflet-map-wrapper">
      <div
        ref={mapRef}
        style={{ width: '100%', height: '420px' }}
      />
      {markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-6 text-center shadow-2xl">
            <span className="text-4xl mb-3 block">🗺️</span>
            <p className="text-gray-200 font-bold text-sm">No sellers with location data found</p>
            <p className="text-gray-400 text-xs mt-1">Register as a seller with an address to appear on the map</p>
          </div>
        </div>
      )}
    </div>
  )
}
