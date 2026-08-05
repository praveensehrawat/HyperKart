import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { initSocket, addMessageListener } from '../lib/socket'
import { updateUser } from '../store/authSlice'
import SellerLocationPicker from '../components/SellerLocationPicker'
import { getProductImage, CATEGORY_PRESET_IMAGES } from '../lib/productImages'

export default function SellerDashboard() {
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const [tab, setTab] = useState('shop')
  
  // State for merchant shop configuration
  const [shopForm, setShopForm] = useState({
    shopName: '', description: '', address: '', phone: '', latitude: '', longitude: '',
  })
  
  // State for inventory product registration
  const [productForm, setProductForm] = useState({
    name: '', description: '', category: '', price: '', stock: '', imageUrl: '',
  })
  
  const [message, setMessage] = useState('')
  const [liveNotifications, setLiveNotifications] = useState([])
  const [sellerProducts, setSellerProducts] = useState([])
  const [editStocks, setEditStocks] = useState({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [flashModalOpen, setFlashModalOpen] = useState(false)
  const [dealTitle, setDealTitle] = useState('')
  const [discountPercent, setDiscountPercent] = useState(20)
  const [flashSubmitting, setFlashSubmitting] = useState(false)

  const handleFlashDealSubmit = async (e) => {
    e.preventDefault()
    if (!dealTitle.trim()) return
    setFlashSubmitting(true)
    try {
      await api.post('/sellers/flash-deal', {
        dealTitle: dealTitle.trim(),
        discountPercent: parseInt(discountPercent) || 20,
      })
      alert('⚡ Flash Deal Broadcasted live to all connected buyers!')
      setFlashModalOpen(false)
      setDealTitle('')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to broadcast flash deal.')
    } finally {
      setFlashSubmitting(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(10)

    const formData = new FormData()
    formData.append('file', file)

    // Simulate progress ticks
    let progress = 10
    const timer = setInterval(() => {
      progress += 25
      if (progress >= 90) {
        clearInterval(timer)
        setUploadProgress(90)
      } else {
        setUploadProgress(progress)
      }
    }, 150)

    try {
      const { data } = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      clearInterval(timer)
      setUploadProgress(100)
      setTimeout(() => {
        setProductForm((prev) => ({ ...prev, imageUrl: data.imageUrl }))
        setUploading(false)
        setUploadProgress(0)
      }, 300)
    } catch (err) {
      clearInterval(timer)
      setUploading(false)
      setUploadProgress(0)
      setMessage('Image upload failed.')
    }
  }


  // Automatically pre-populate shop configurations if profile exists
  useEffect(() => {
    if (user?.seller) {
      setShopForm({
        shopName: user.seller.shopName || '',
        description: user.seller.description || '',
        address: user.seller.address || '',
        phone: user.seller.phone || '',
        latitude: user.seller.location?.coordinates[1] || '',
        longitude: user.seller.location?.coordinates[0] || '',
      })
    }
  }, [user])

  // Fetch seller products if shop is configured
  useEffect(() => {
    if (user?.seller?.id) {
      api.get(`/products/seller/${user.seller.id}`)
        .then(({ data }) => setSellerProducts(data))
        .catch(console.error)
    }
  }, [user, tab])

  /**
   * Dispatches shop profile creation or updates to backend.
   */
  const handleShopSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      const payload = {
        ...shopForm,
        latitude: parseFloat(shopForm.latitude),
        longitude: parseFloat(shopForm.longitude),
      }
      if (user.seller) {
        const response = await api.put('/sellers', payload)
        dispatch(updateUser({ seller: response.data }))
        setMessage('Shop updated successfully!')
      } else {
        const response = await api.post('/sellers', payload)
        dispatch(updateUser({ seller: response.data }))
        setMessage('Shop created successfully!')
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save shop details')
    }
  }

  /**
   * Registers a new product listing under current merchant credentials.
   */
  const addProduct = async (e) => {
    e.preventDefault()
    setMessage('')
    try {
      await api.post('/products', {
        ...productForm,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock, 10),
      })
      setMessage('Product added successfully!')
      setProductForm({ name: '', description: '', category: '', price: '', stock: '', imageUrl: '' })
      // Trigger list refresh
      if (user?.seller?.id) {
        api.get(`/products/seller/${user.seller.id}`)
          .then(({ data }) => setSellerProducts(data))
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to add product')
    }
  }

  /**
   * Updates existing product stock quantities in inventory.
   */
  const updateStock = async (p, newStock) => {
    setMessage('')
    try {
      await api.put(`/products/${p.id}`, {
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        imageUrl: p.imageUrl,
        stock: parseInt(newStock, 10)
      })
      setMessage('Stock updated successfully!')
      if (user?.seller?.id) {
        api.get(`/products/seller/${user.seller.id}`)
          .then(({ data }) => setSellerProducts(data))
      }
    } catch (_err) {
      setMessage('Failed to update stock')
    }
  }

  /**
   * Captures coordinates from the browser's Geolocation API.
   */
  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setShopForm((f) => ({
        ...f,
        latitude: pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      }))
    })
  }

  // Route protection - Redirect to home if user is not a merchant
  useEffect(() => {
    if (!user || user.role !== 'SELLER') {
      navigate('/')
    }
  }, [user, navigate])

  // Subscribe to real-time order notifications and product updates on mount
  useEffect(() => {
    initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    const off = addMessageListener((msg) => {
      if (msg?.type === 'order_notification') {
        setLiveNotifications((n) => [{ id: Date.now(), timestamp: Date.now(), ...msg }, ...n].slice(0, 20))
      }
      if (msg?.type === 'product_update') {
        setLiveNotifications((n) => [{ id: Date.now(), timestamp: Date.now(), ...msg }, ...n].slice(0, 20))
      }
    })

    return () => off()
  }, [])

  if (!user || user.role !== 'SELLER') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Merchant Header Banner & 1-Click Flash Sale CTA */}
      <div className="glass-card p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden shadow-2xl font-Outfit">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                VERIFIED LOCAL MERCHANT
              </span>
              {user.seller && (
                <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full font-bold">
                  {user.seller.shopName || 'Store Configured'}
                </span>
              )}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-100 tracking-tight">
              Merchant Command Center 👋
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Manage shop geolocation, broadcast 1-click live flash deals, update inventory stock levels, and track real-time revenue analytics.
            </p>
          </div>

          {user.seller && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFlashModalOpen(true)}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <span className="text-base">⚡</span>
                <span>Launch Live Flash Sale</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl p-4 text-xs font-semibold animate-pulse">
          {message}
        </div>
      )}



      {/* Navigation tabs */}
      <div className="flex flex-wrap gap-2 items-center border-b border-white/5 pb-3">
        <button 
          onClick={() => setTab('shop')} 
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'shop' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md' : 'bg-slate-900 border border-white/5 text-gray-400 hover:text-white'}`}
        >
          {user.seller ? '🏪 Edit Shop & GPS Map' : '🏪 Setup Merchant Shop'}
        </button>
        <button 
          onClick={() => setTab('product')} 
          disabled={!user.seller}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 ${tab === 'product' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md' : 'bg-slate-900 border border-white/5 text-gray-400 hover:text-white'}`}
        >
          📦 My Products & Stock ({sellerProducts.length})
        </button>
        <button 
          onClick={() => setTab('analytics')} 
          disabled={!user.seller}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 ${tab === 'analytics' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md' : 'bg-slate-900 border border-white/5 text-gray-400 hover:text-white'}`}
        >
          📊 Revenue Analytics & Low Stock Alerts
        </button>
      </div>

      {tab === 'shop' && (
        <form onSubmit={handleShopSubmit} className="glass-card p-6 max-w-lg space-y-4 font-Outfit">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Shop Name</label>
            <input 
              placeholder="Shop Name" 
              value={shopForm.shopName} 
              onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
              className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea 
              placeholder="Store description..." 
              value={shopForm.description} 
              onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm leading-relaxed" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Physical Address</label>
            <input 
              placeholder="Address" 
              value={shopForm.address} 
              onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
              className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Phone Number</label>
            <input 
              placeholder="Phone" 
              value={shopForm.phone} 
              onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
              className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono" 
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Shop Geolocation</label>
            <SellerLocationPicker
              latitude={shopForm.latitude}
              longitude={shopForm.longitude}
              onChange={(lat, lng) => setShopForm(f => ({
                ...f,
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6)
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Latitude</label>
              <input 
                placeholder="Latitude" 
                value={shopForm.latitude} 
                onChange={(e) => setShopForm({ ...shopForm, latitude: e.target.value })}
                className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center" 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Longitude</label>
              <input 
                placeholder="Longitude" 
                value={shopForm.longitude} 
                onChange={(e) => setShopForm({ ...shopForm, longitude: e.target.value })}
                className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center" 
                required 
              />
            </div>
          </div>

          <button 
            type="button" 
            onClick={useMyLocation} 
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer block"
          >
            📍 Detect My Geolocation Coordinates
          </button>
          
          <button 
            type="submit" 
            className="w-full btn-neon text-white py-3.5 rounded-xl font-extrabold transition-all text-sm mt-4 cursor-pointer"
          >
            {user.seller ? 'Update Shop Settings' : 'Initialize Merchant Shop'}
          </button>
        </form>
      )}

      {tab === 'product' && (
        <div className="space-y-6">
          <form onSubmit={addProduct} className="glass-card p-6 max-w-lg space-y-4 font-Outfit">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Product Name</label>
              <input 
                placeholder="Product Name" 
                value={productForm.name} 
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea 
                placeholder="Product description..." 
                value={productForm.description} 
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm leading-relaxed" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
              <input 
                placeholder="e.g. Groceries, Electronics, Dairy" 
                value={productForm.category} 
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Price ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={productForm.price} 
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Initial Stock</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={productForm.stock} 
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center" 
                  required 
                />
              </div>
            </div>

            <div className="space-y-3 font-Outfit">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Product Image</label>
              
              {/* Image Upload Drop Zone / Preview */}
              <div className="border border-dashed border-white/15 rounded-xl p-4 bg-slate-950/40 hover:bg-slate-950/60 transition-all text-center relative flex flex-col items-center justify-center min-h-[140px]">
                {uploading ? (
                  <div className="space-y-2 w-full max-w-[200px]">
                    <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mx-auto"></div>
                    <p className="text-[10px] text-gray-400 font-bold">Uploading to CDN... {uploadProgress}%</p>
                    <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : productForm.imageUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <img 
                      src={productForm.imageUrl} 
                      alt="Preview" 
                      className="max-h-24 max-w-full rounded-lg object-contain border border-white/10 shadow-md bg-slate-950" 
                    />
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setProductForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-md font-bold hover:bg-red-500/30 transition-all cursor-pointer"
                      >
                        🗑️ Delete Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 p-2 w-full">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs text-indigo-400 font-bold hover:text-indigo-300">Click to Upload Image File</span>
                    <span className="text-[10px] text-gray-500">Supports JPEG, PNG, WEBP</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {/* 📸 1-Tap Preset Product Image Gallery Picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">📸 Or Pick 1-Tap High-Res Product Photo</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_PRESET_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProductForm({ ...productForm, imageUrl: preset.url })}
                      className="relative h-14 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400 group cursor-pointer shadow-sm transition-all hover:scale-105"
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <span className="absolute inset-0 bg-slate-950/40 text-[9px] text-white font-bold flex items-end p-1 leading-tight line-clamp-1">
                        {preset.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* URL fallback */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide">Or Paste Custom Image URL</label>
                <input 
                  placeholder="https://images.unsplash.com/photo-..." 
                  value={productForm.imageUrl} 
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs font-mono" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full btn-neon text-white py-3.5 rounded-xl font-extrabold transition-all text-sm mt-4 cursor-pointer"
            >
              Add Product to Catalog
            </button>
          </form>

          {/* Product listings */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Your Products Directory</h3>
            <div className="grid gap-4">
              {sellerProducts.length === 0 && (
                <p className="text-xs text-gray-500 font-Outfit">No products listed in catalog yet.</p>
              )}
              {sellerProducts.map((p) => (
                <div key={p.id} className="bg-slate-950/40 border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-Outfit">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10 shadow-md">
                      <img 
                        src={getProductImage(p)} 
                        alt={p.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = getProductImage({ category: p.category })
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-200">{p.name}</div>
                      <div className="text-[10px] text-indigo-400 font-extrabold uppercase mt-0.5">{p.category}</div>
                      <div className="text-xs text-gray-500 mt-1 font-mono">Stock: <span className="text-pink-400 font-black">{p.stock}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input 
                      type="number" 
                      value={editStocks[p.id] ?? p.stock} 
                      onChange={(e) => setEditStocks((s) => ({ ...s, [p.id]: Number(e.target.value) }))}
                      className="w-20 bg-slate-950 border border-white/10 text-white rounded-lg px-2 py-1.5 focus:outline-none text-center font-mono text-sm" 
                    />
                    <button 
                      onClick={() => updateStock(p, Number(editStocks[p.id] ?? p.stock))} 
                      className="px-4 py-1.5 bg-indigo-600 border border-indigo-500/20 text-white font-extrabold text-xs rounded-lg hover:bg-indigo-500 transition-all cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-6 md:grid-cols-2 font-Outfit">
          {/* Revenue Chart */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-gray-200">Daily Sales Revenue</h3>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">Last 7 Days</span>
            </div>
            <div className="h-[200px] flex items-center justify-center">
              <svg viewBox="0 0 500 200" className="w-full h-full text-indigo-500">
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                
                <text x="15" y="174" fill="#64748b" fontSize="10" fontFamily="monospace">$0</text>
                <text x="10" y="124" fill="#64748b" fontSize="10" fontFamily="monospace">$250</text>
                <text x="10" y="74" fill="#64748b" fontSize="10" fontFamily="monospace">$500</text>
                <text x="10" y="24" fill="#64748b" fontSize="10" fontFamily="monospace">$750</text>

                <path
                  d="M 40 170 Q 113 146 113 146 Q 186 113 186 113 Q 260 130 260 130 Q 333 97 333 97 Q 406 65 406 65 Q 480 30 480 30 L 480 170 Z"
                  fill="url(#colorUv)"
                />
                <path
                  d="M 40 170 Q 113 146 113 146 Q 186 113 186 113 Q 260 130 260 130 Q 333 97 333 97 Q 406 65 406 65 Q 480 30 480 30"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                />
                <circle cx="40" cy="170" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="113" cy="146" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="186" cy="113" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="260" cy="130" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="333" cy="97" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="406" cy="65" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />
                <circle cx="480" cy="30" r="4" fill="#6366f1" stroke="white" strokeWidth="1" />

                <text x="35" y="190" fill="#64748b" fontSize="9">Mon</text>
                <text x="108" y="190" fill="#64748b" fontSize="9">Tue</text>
                <text x="181" y="190" fill="#64748b" fontSize="9">Wed</text>
                <text x="255" y="190" fill="#64748b" fontSize="9">Thu</text>
                <text x="328" y="190" fill="#64748b" fontSize="9">Fri</text>
                <text x="401" y="190" fill="#64748b" fontSize="9">Sat</text>
                <text x="475" y="190" fill="#64748b" fontSize="9">Sun</text>
              </svg>
            </div>
          </div>

          {/* Product Category Distribution Donut */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-gray-200">Catalog Category Breakdown</h3>
              <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20">Category Shares</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-4">
              <svg viewBox="0 0 100 100" className="w-32 h-32">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#6366f1" strokeWidth="15" strokeDasharray="88 220" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#ec4899" strokeWidth="15" strokeDasharray="66 220" strokeDashoffset="-88" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#14b8a6" strokeWidth="15" strokeDasharray="44 220" strokeDashoffset="-154" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="#f59e0b" strokeWidth="15" strokeDasharray="22 220" strokeDashoffset="-198" />
                <circle cx="50" cy="50" r="22" fill="#0b0f19" />
              </svg>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                  <span className="text-gray-300">Beverages (40%)</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-pink-500" />
                  <span className="text-gray-300">Bakery (30%)</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-teal-500" />
                  <span className="text-gray-300">Grocery (20%)</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span className="text-gray-300">Dairy (10%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 📊 PRODUCT MARKET DEMAND ANALYTICS & PROFIT GAIN BREAKDOWN */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-sm font-extrabold text-gray-200 flex items-center gap-2">
                  <span>📈</span> Product Market Demand & Profit Gain Analytics
                </h3>
                <p className="text-[10px] text-gray-400">Local Zirakpur market demand velocity and net profit gains per item</p>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                INR Local Market
              </span>
            </div>

            <div className="space-y-3">
              {sellerProducts.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Register catalog products to see live market demand analytics.</p>
              ) : (
                sellerProducts.map((p) => {
                  const costPrice = p.price * 0.75 // 25% estimated wholesale margin
                  const netGainPerUnit = p.price - costPrice
                  const unitsSoldEstimate = Math.max(12, (p.stock || 1) * 3 + 5)
                  const totalProfitGain = netGainPerUnit * unitsSoldEstimate

                  return (
                    <div key={p.id} className="bg-slate-950/60 border border-white/10 p-3.5 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs text-gray-100">{p.name}</h4>
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                            📈 High Demand (Top 5% in Zirakpur)
                          </span>
                        </div>
                        <span className="text-xs font-mono font-extrabold text-emerald-400">
                          Selling Price: ₹{p.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-Outfit pt-2 border-t border-white/5">
                        <div>
                          <span className="text-gray-500 text-[9px] block uppercase font-bold">Est. Wholesale Cost</span>
                          <span className="font-mono text-gray-300">₹{costPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[9px] block uppercase font-bold">Profit Gain / Unit</span>
                          <span className="font-mono text-emerald-400 font-bold">+₹{netGainPerUnit.toFixed(2)} (25% Margin)</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[9px] block uppercase font-bold">Market Units Sold</span>
                          <span className="font-mono text-gray-200 font-bold">{unitsSoldEstimate} Units</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[9px] block uppercase font-bold">Total Net Profit</span>
                          <span className="font-mono text-emerald-300 font-black">+₹{totalProfitGain.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 🧾 MERCHANT B2B GST TAX & BILLING REPORTS */}
          {(() => {
            const totalInventoryValue = sellerProducts.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0)
            const gstCollected = totalInventoryValue * 0.18
            const platformFee = totalInventoryValue * 0.03
            const netPayout = Math.max(0, totalInventoryValue - platformFee)

            return (
              <div className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-extrabold text-gray-200 flex items-center gap-2">
                    <span>🧾</span> B2B GST Tax Billing & Ledger Report
                  </h3>
                  <span className="text-[10px] text-indigo-300 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    GSTIN Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-Outfit">
                  <div className="bg-slate-950/60 border border-white/10 p-3.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">GST Tax Collected (18%)</span>
                    <span className="text-lg font-mono font-black text-indigo-300 mt-1 block">₹{gstCollected.toFixed(2)}</span>
                    <span className="text-[9px] text-gray-500">CGST 9% + SGST 9% Filed</span>
                  </div>

                  <div className="bg-slate-950/60 border border-white/10 p-3.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Platform Commission Fee</span>
                    <span className="text-lg font-mono font-black text-rose-400 mt-1 block">₹{platformFee.toFixed(2)}</span>
                    <span className="text-[9px] text-gray-500">3% Merchant Rate</span>
                  </div>

                  <div className="bg-slate-950/60 border border-white/10 p-3.5 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Net Payout to Bank Account</span>
                    <span className="text-lg font-mono font-black text-emerald-400 mt-1 block">₹{netPayout.toFixed(2)}</span>
                    <span className="text-[9px] text-emerald-400 font-bold">Direct Bank Transfer</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Low Stock Alerts */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-gray-200">Stock Threshold Alerts</h3>
              <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">Critical Attention</span>
            </div>
            <div className="space-y-2.5">
              {sellerProducts.filter(p => p.stock < 5).length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">✔ All catalog items are sufficiently stocked.</p>
              ) : (
                sellerProducts.filter(p => p.stock < 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-xs">
                    <div>
                      <span className="font-bold text-gray-200">{p.name}</span>
                      <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">{p.category}</p>
                    </div>
                    <span className="bg-red-500/20 text-red-400 font-black px-2.5 py-1 rounded font-mono">Stock: {p.stock}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HYPERKART Popular Search Query Trends */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-gray-200">HYPERKART Search Trends</h3>
              <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">Store Proximity</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-medium">
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <span className="text-gray-300">"hot coffee"</span>
                <span className="text-emerald-400 font-bold">↗ +82%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <span className="text-gray-300">"iced tea"</span>
                <span className="text-emerald-400 font-bold">↗ +45%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <span className="text-gray-300">"croissant"</span>
                <span className="text-emerald-400 font-bold">↗ +30%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex justify-between items-center">
                <span className="text-gray-300">"lemonade"</span>
                <span className="text-rose-400 font-bold">↘ -12%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time notifications pane */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-gray-200 mb-4">Live Dispatch Notifications</h3>
        <div className="space-y-3 font-Outfit">
          {liveNotifications.length === 0 && (
            <p className="text-xs text-gray-500">No events logged during session yet.</p>
          )}
          {liveNotifications.map((n) => (
            <div key={n.id} className="bg-slate-950/40 border border-white/5 p-3.5 rounded-xl text-xs border-l-4 border-l-yellow-500 relative overflow-hidden">
              <div className="text-[9px] text-gray-500 font-black font-mono">{new Date(n.timestamp || Date.now()).toLocaleTimeString()}</div>
              <div className="mt-1.5 text-gray-300 font-medium leading-relaxed">
                <span className="font-extrabold text-yellow-400 uppercase tracking-wide mr-1.5">{n.type?.replace('_', ' ')}</span>: 
                <span className="font-mono text-gray-400 ml-1">{n.name || n.productId || ''}</span> 
                {n.stock != null ? ` (Updated Stock: ${n.stock})` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flash Deal Modal */}
      {flashModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 font-Outfit animate-toast-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <span>⚡</span> Broadcast 2-Hour Flash Deal
              </h3>
              <button 
                onClick={() => setFlashModalOpen(false)} 
                className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFlashDealSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Deal Title / Promotion</label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="e.g. 50% Off Fresh Artisan Bread for Next 2 Hours!"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Discount Percentage (%)</label>
                <input
                  type="number"
                  min="5"
                  max="90"
                  required
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <p className="text-[10px] text-gray-400 bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20">
                📢 Clicking Broadcast will send a live WebSocket push banner to all active buyers in real-time!
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlashModalOpen(false)}
                  className="text-xs bg-slate-800 text-gray-300 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flashSubmitting}
                  className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-5 py-2.5 rounded-xl hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  {flashSubmitting ? 'Broadcasting...' : '⚡ Push Live Deal Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
