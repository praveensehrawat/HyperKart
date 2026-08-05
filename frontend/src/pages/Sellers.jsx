import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import SellerMap from '../components/SellerMap'

// Haversine formula to compute physical distance in kilometers between two GPS coordinates
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function Sellers() {
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role === 'DRIVER') {
      navigate('/driver-dashboard')
    }
  }, [user, navigate])
  const [sellers, setSellers] = useState([])
  const [nearby, setNearby] = useState([])
  const [location, setLocation] = useState({ lat: 30.6425, lng: 76.8173 })
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const mapSectionRef = useRef(null)

  // Fetch all registered sellers on component mount
  useEffect(() => {
    api.get('/sellers')
      .then(({ data }) => setSellers(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Retrieve user location and fetch merchants within 10km radius
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        api.get(`/sellers/nearby?lat=${loc.lat}&lng=${loc.lng}&radiusKm=10`)
          .then(({ data }) => setNearby(data))
          .catch(console.error)
      })
    }
  }, [])

  const extractSellerCoords = (seller) => {
    if (!seller) return null
    const loc = seller.location
    const lat = loc?.coordinates?.[1] ?? loc?.y ?? seller.lat
    const lng = loc?.coordinates?.[0] ?? loc?.x ?? seller.lng
    if (lat && lng) return { lat: Number(lat), lng: Number(lng) }
    return null
  }

  const handleSelectShop = (sellerObj, distKm) => {
    const coords = extractSellerCoords(sellerObj)
    const sellerData = {
      ...sellerObj,
      lat: coords?.lat,
      lng: coords?.lng,
      distanceKm: distKm
    }
    setSelectedSeller(sellerData)
    if (mapSectionRef.current) {
      mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const [activeMapModal, setActiveMapModal] = useState(null)
  const [modalTab, setModalTab] = useState('overview')

  const handleOpenMapModal = (sellerObj, distKm, e) => {
    e.stopPropagation()
    const coords = extractSellerCoords(sellerObj)
    setModalTab('overview')
    setActiveMapModal({
      ...sellerObj,
      lat: coords?.lat || 30.6425,
      lng: coords?.lng || 76.8173,
      distanceKm: distKm
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 font-Outfit">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-indigo-300 font-medium animate-pulse">Scanning nearby merchants...</p>
      </div>
    )
  }

  // Use nearby sellers if available, otherwise display all registered sellers
  const displayList = nearby.length ? nearby : sellers.map((s) => ({ seller: s }))

  return (
    <div className="relative font-Outfit space-y-6">
      <div>
        <span className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          📍 Geospatial Map & Directory
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Nearby Merchant Shops</h2>
        <p className="text-gray-400 text-sm">Click "View Location on Map" on any store card to open a full Google Maps style interactive map window with turn-by-turn navigation.</p>
      </div>
      
      {/* Primary Map visualization container */}
      <div ref={mapSectionRef} className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950 p-2 relative">
        <SellerMap
          sellers={displayList}
          center={selectedSeller?.lat && selectedSeller?.lng ? { lat: selectedSeller.lat, lng: selectedSeller.lng } : location}
          onSelect={(sellerMarker) => {
            const rawSeller = sellers.find(s => s.id === sellerMarker.id) || sellerMarker
            handleSelectShop(rawSeller, sellerMarker.distanceKm)
          }}
        />
      </div>

      {/* Grid listing of merchants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {displayList.map((item) => {
          const s = item.seller || item
          const coords = extractSellerCoords(s)
          
          // Calculate distance dynamically if not provided by backend
          let dist = item.distanceKm
          if (dist == null && location && coords) {
            dist = calcDistanceKm(location.lat, location.lng, coords.lat, coords.lng)
          }

          const isSelected = selectedSeller?.id === s.id
          const isVeryClose = dist != null && dist <= 2.5

          return (
            <div 
              key={s.id} 
              onClick={() => handleSelectShop(s, dist)}
              className={`glass-card p-5 rounded-2xl relative overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col justify-between ${
                isSelected ? 'border-indigo-500/70 bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-2xl' : 'hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-100 group-hover:text-indigo-300 transition-colors">
                      {s.shopName}
                    </h3>
                    <p className="text-[11px] text-indigo-400 font-mono font-bold mt-0.5">
                      Merchant ID: #{s.id?.substring(0, 8) || 'STORE'}
                    </p>
                  </div>

                  {dist != null ? (
                    <span className={`font-black text-xs px-3 py-1 rounded-full border shadow-sm font-mono ${
                      isVeryClose ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}>
                      ⚡ {dist.toFixed(2)} km
                    </span>
                  ) : (
                    <span className="font-bold text-[10px] bg-slate-900 border border-white/10 text-gray-400 px-2.5 py-1 rounded-full font-mono">
                      📍 Geolocated
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mt-2">
                  {s.description || 'Verified local shop offering quick 15-minute HYPERKART delivery & counter pickup.'}
                </p>

                <p className="text-[11px] text-gray-400 mt-4 flex items-center gap-1.5 font-mono">
                  <span>📍</span> {s.address || 'Local Marketplace Counter'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handleOpenMapModal(s, dist, e)}
                  className="bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <span>📍</span> View Location on Map
                </button>

                <a
                  href={`/#/products?sellerId=${s.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-900 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow"
                >
                  <span>🛍️</span> View Products
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* 🗺️ Google Maps Authentic Split-Screen Store Detail Modal */}
      {activeMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="!bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-5xl w-full h-[90vh] max-h-[720px] overflow-hidden shadow-2xl font-Outfit flex flex-col animate-scale-up !text-white">
            {/* Modal Header */}
            <div className="px-5 py-3.5 !bg-slate-950 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏪</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base !text-white">{activeMapModal.shopName || activeMapModal.name}</h3>
                    <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                      ★ 4.9 <span className="text-gray-400 font-normal">(190 reviews)</span>
                    </span>
                  </div>
                  <p className="text-[11px] !text-gray-400 font-mono flex items-center gap-1">
                    <span>📍</span> {activeMapModal.address || 'Local Merchant Counter, Zirakpur'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveMapModal(null)}
                className="w-8 h-8 rounded-full !bg-slate-800 hover:!bg-rose-600 !text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-md"
                title="Close Window"
              >
                ✕
              </button>
            </div>

            {/* Split Screen Body: Left Info Sidebar + Right Interactive Google Map */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              {/* Left Showcase Sidebar (5 Cols) */}
              <div className="md:col-span-5 p-5 !bg-slate-950/90 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Store Cover Image */}
                  <div className="relative h-40 rounded-2xl overflow-hidden border border-white/10 shadow-lg group">
                    <img
                      src={activeMapModal.imageUrl || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80'}
                      alt={activeMapModal.shopName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-3 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                      🟢 Verified Open Merchant
                    </span>
                  </div>

                  {/* Navigation Tabs Bar */}
                  <div className="flex border-b border-white/10 text-xs font-bold text-gray-400">
                    <button
                      onClick={() => setModalTab('overview')}
                      className={`pb-2 px-2.5 transition-all cursor-pointer ${
                        modalTab === 'overview' ? 'border-b-2 border-cyan-400 text-cyan-300 font-black' : 'hover:text-white'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setModalTab('photos')}
                      className={`pb-2 px-2.5 transition-all cursor-pointer ${
                        modalTab === 'photos' ? 'border-b-2 border-cyan-400 text-cyan-300 font-black' : 'hover:text-white'
                      }`}
                    >
                      Photos (4)
                    </button>
                    <button
                      onClick={() => setModalTab('reviews')}
                      className={`pb-2 px-2.5 transition-all cursor-pointer ${
                        modalTab === 'reviews' ? 'border-b-2 border-cyan-400 text-cyan-300 font-black' : 'hover:text-white'
                      }`}
                    >
                      Reviews (190)
                    </button>
                    <button
                      onClick={() => setModalTab('about')}
                      className={`pb-2 px-2.5 transition-all cursor-pointer ${
                        modalTab === 'about' ? 'border-b-2 border-cyan-400 text-cyan-300 font-black' : 'hover:text-white'
                      }`}
                    >
                      About
                    </button>
                  </div>

                  {/* Google Maps 5 Circular Action Buttons */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${activeMapModal.lat},${activeMapModal.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600 hover:text-white transition-all text-[9px] font-bold text-center"
                    >
                      <span className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-sm">🚗</span>
                      <span>Directions</span>
                    </a>
                    <button className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-white/10 text-gray-300 hover:text-white transition-all text-[9px] font-bold">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">🔖</span>
                      <span>Save</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-white/10 text-gray-300 hover:text-white transition-all text-[9px] font-bold">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">📍</span>
                      <span>Nearby</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-white/10 text-gray-300 hover:text-white transition-all text-[9px] font-bold">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">📱</span>
                      <span>Send to phone</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-slate-900 border border-white/10 text-gray-300 hover:text-white transition-all text-[9px] font-bold">
                      <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">📤</span>
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Overview Tab Content */}
                  {modalTab === 'overview' && (
                    <div className="space-y-3 bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl text-xs animate-fade-in">
                      <div className="flex justify-between items-center text-gray-300 font-mono">
                        <span>Proximity Distance:</span>
                        <span className="text-emerald-400 font-extrabold">⚡ {activeMapModal.distanceKm != null ? activeMapModal.distanceKm.toFixed(2) : '0.85'} km</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 font-mono">
                        <span>Express Delivery:</span>
                        <span className="text-indigo-300 font-bold">🛵 15-Min Delivery</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-300 font-mono">
                        <span>Operating Hours:</span>
                        <span className="text-gray-200">Open 24/7</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 space-y-1 text-emerald-400 font-bold text-[11px]">
                        <div>✓ In-Store Pickup / Counter Purchase</div>
                        <div>✓ 15-Min HYPERKART Doorstep Delivery</div>
                        <div>✓ No-Contact Hygienic Dispatch</div>
                      </div>
                    </div>
                  )}

                  {/* Photos Tab Content */}
                  {modalTab === 'photos' && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 border border-white/10 p-3 rounded-2xl text-xs animate-fade-in">
                      {[
                        { title: 'Storefront', url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&auto=format&fit=crop&q=80' },
                        { title: 'Fresh Produce Counter', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80' },
                        { title: 'Grocery Aisles', url: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=400&auto=format&fit=crop&q=80' },
                        { title: 'Checkout Counter', url: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&auto=format&fit=crop&q=80' }
                      ].map((img, i) => (
                        <div key={i} className="relative h-20 rounded-xl overflow-hidden border border-white/10 group">
                          <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          <span className="absolute bottom-1 left-1.5 text-[9px] bg-slate-950/80 text-white px-1.5 py-0.5 rounded font-mono font-bold">{img.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer Reviews Tab */}
                  {modalTab === 'reviews' && (
                    <div className="space-y-3 bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl text-xs animate-fade-in max-h-56 overflow-y-auto">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 font-extrabold text-base">4.9 ★★★★★</span>
                          <span className="text-gray-400 text-[10px]">(190 Ratings)</span>
                        </div>
                        <button className="bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer">
                          ✍️ Write Review
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-white text-[11px]">Rahul Sharma</span>
                            <span className="text-amber-400 text-[10px]">★★★★★</span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-snug">"Super fast 10-minute delivery for my grocery order! Items were fresh and packed nicely."</p>
                          <span className="text-[9px] text-gray-500 font-mono">Verified Buyer • 2 days ago</span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-white text-[11px]">Priya Patel</span>
                            <span className="text-amber-400 text-[10px]">★★★★★</span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-snug">"Extremely polite store owner and genuine prices. Highly recommended local Kiryana store!"</p>
                          <span className="text-[9px] text-gray-500 font-mono">Verified Buyer • 1 week ago</span>
                        </div>

                        <div className="bg-slate-950 p-2.5 rounded-xl border border-white/5 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-white text-[11px]">Amanpreet Singh</span>
                            <span className="text-amber-400 text-[10px]">★★★★★</span>
                          </div>
                          <p className="text-[11px] text-gray-300 leading-snug">"Always has prescription medicines and fresh dairy in stock 24/7."</p>
                          <span className="text-[9px] text-gray-500 font-mono">Verified Buyer • 2 weeks ago</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* About Merchant Tab */}
                  {modalTab === 'about' && (
                    <div className="space-y-2.5 bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl text-xs animate-fade-in">
                      <h4 className="font-extrabold text-indigo-300 text-xs">About Merchant & Shop</h4>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        {activeMapModal.description || 'Your trusted neighborhood grocer for fresh foods, organic spices, grains, and daily household essentials. Verified HYPERKART partner offering 15-minute express doorstep delivery & counter pickup.'}
                      </p>
                      <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-[11px] text-gray-400">
                        <div>📍 Address: <span className="text-gray-200">{activeMapModal.address || 'VIP Road, Zirakpur, Punjab'}</span></div>
                        <div>📞 Contact: <span className="text-indigo-300">+91 {activeMapModal.phone || '98765 43210'}</span></div>
                        <div>🛡️ License: <span className="text-emerald-400 font-bold">Verified HYPERKART Merchant Partner</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Cyan CTA Button (Matching Screenshot 2) */}
                <a
                  href={`/#/products?sellerId=${activeMapModal.id}`}
                  className="w-full py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-xl transition-all transform hover:scale-102 cursor-pointer font-Outfit"
                >
                  <span>🛍️</span> Order Online →
                </a>
              </div>

              {/* Right Interactive OpenStreetMap & Seller Location Map View (7 Cols) */}
              <div className="md:col-span-7 h-full w-full relative min-h-[420px] bg-slate-950 overflow-hidden rounded-r-3xl">
                <SellerMap
                  sellers={[{ seller: activeMapModal }]}
                  center={{ lat: activeMapModal.lat || 30.6425, lng: activeMapModal.lng || 76.8173 }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
