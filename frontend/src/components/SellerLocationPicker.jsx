/**
 * Leaflet + OpenStreetMap Seller Location Picker Component
 * =======================================================
 * Allows merchant to select their physical shop location by clicking on the map
 * or dragging a custom pin. Updates parent coordinates state.
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

export default function SellerLocationPicker({ latitude, longitude, onChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerInstanceRef = useRef(null)
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

  const initialLat = parseFloat(latitude) || 28.6139
  const initialLng = parseFloat(longitude) || 77.209

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map)
    mapInstanceRef.current = map

    // Force Leaflet to recalculate container size after DOM is fully painted
    setTimeout(() => map.invalidateSize(), 100)
    setTimeout(() => map.invalidateSize(), 500)

    // Render mock POIs around the initial picker center
    const poiMarkers = generateMockPOIs(L, { lat: initialLat, lng: initialLng })
    poiMarkers.forEach(poi => poi.addTo(map))

    // Custom marker icon
    const markerIcon = L.divIcon({
      className: 'picker-marker',
      html: `<div style="
        width: 36px; height: 36px; 
        background: linear-gradient(135deg, #ec4899, #8b5cf6); 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        border: 3px solid white; 
        box-shadow: 0 4px 16px rgba(236,72,153,0.5);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); font-size: 16px;">🏪</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    })

    // Add draggable marker
    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: markerIcon,
    }).addTo(map)

    markerInstanceRef.current = marker

    // Marker drag handler
    marker.on('dragend', (e) => {
      const position = e.target.getLatLng()
      onChange(position.lat, position.lng)
    })

    // Map click handler
    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      onChange(lat, lng)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerInstanceRef.current = null
    }
  }, [leafletLoaded])

  // Move marker when external coordinates update
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !markerInstanceRef.current) return
    const currentLat = parseFloat(latitude)
    const currentLng = parseFloat(longitude)

    if (currentLat && currentLng) {
      const markerLatLng = markerInstanceRef.current.getLatLng()
      if (markerLatLng.lat !== currentLat || markerLatLng.lng !== currentLng) {
        markerInstanceRef.current.setLatLng([currentLat, currentLng])
        mapInstanceRef.current.panTo([currentLat, currentLng])
      }
    }
  }, [latitude, longitude, leafletLoaded])

  if (!leafletLoaded) {
    return (
      <div className="flex items-center justify-center h-72 rounded-xl bg-slate-950/50 border border-white/5">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-400 text-xs">Loading Location Map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaflet-map-wrapper">
      <div
        ref={mapRef}
        style={{ width: '100%', height: '320px' }}
        className="border border-white/10"
      />
      <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-300 font-Outfit pointer-events-none shadow-lg">
        🖱️ Click anywhere or drag the pin to set store location.
      </div>
    </div>
  )
}
