/**
 * Products Directory Page
 * =======================
 * Displays a paginated catalog of available items. Links real-time
 * stock alerts to local state and lets users purchase items directly or add them to the cart.
 */

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../api/axios'
import { addItem } from '../store/cartSlice'
import { useToast } from '../components/Toast'
import { initSocket, addMessageListener } from '../lib/socket'
import GroupBuyingWidget from '../components/GroupBuyingWidget'
import { soundFx } from '../lib/soundFx'
import { getProductImage } from '../lib/productImages'

export default function Products() {
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [orderQuantities, setOrderQuantities] = useState({})
  
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const addToast = useToast()

  const searchParams = new URLSearchParams(location.search)
  const sellerId = searchParams.get('sellerId')

  useEffect(() => {
    if (user?.role === 'DRIVER') {
      navigate('/driver-dashboard')
    }
  }, [user, navigate])

  // Load paginated list of active products and configure real-time updates
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      try {
        const endpoint = sellerId ? `/products/seller/${sellerId}` : `/products?page=${page}&size=12`
        const { data } = await api.get(endpoint)
        const itemsList = Array.isArray(data) ? data : (data.content || [])
        setProducts(itemsList)
        setTotalPages(data.totalPages || 1)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()

    // Initialize WebSocket listener for live stock updates
    const client = initSocket({ url: import.meta.env.DEV ? undefined : '/ws' })
    const off = addMessageListener((msg) => {
      if (msg && msg.type === 'product_update' && msg.productId) {
        setProducts((prev) => prev.map((p) => (p.id === msg.productId ? { ...p, stock: msg.stock ?? p.stock } : p)))
        addToast && addToast(`${msg.name || 'Product'} stock updated: ${msg.stock}`, 'info')
      }
    })

    return () => {
      off()
    }
  }, [page, sellerId])

  /**
   * Adds selected product to the local Redux cart store context.
   */
  const addToCart = (product) => {
    soundFx.playCartSound()
    dispatch(addItem({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        sellerName: product.sellerName || product.shopName || 'Local Seller',
      },
      sellerId: product.sellerId,
      quantity: orderQuantities[product.id] || 1,
    }))
    addToast(`${product.name} added to cart.`, 'success')
  }

  /**
   * Directly posts a checkout transaction for a single product.
   */
  const placeOrder = async (product) => {
    if (!user) { 
      navigate('/login')
      return 
    }
    const address = prompt('Delivery address:')
    if (!address) return
    try {
      await api.post('/orders', {
        sellerId: product.sellerId,
        deliveryAddress: address,
        items: [{ productId: product.id, quantity: orderQuantities[product.id] || 1 }],
      })
      addToast('Order placed successfully!', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Order failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 font-Outfit">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-indigo-300 font-medium animate-pulse text-sm">Loading local products & inventory...</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
            👜 Local Catalog
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gradient">Explore Local Products</h2>
        </div>
      </div>
      

      {/* 👥 Active Neighborhood Group Buying Deals */}
      <GroupBuyingWidget />
      
      {/* Product item listings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
        {products.map((p) => {
          const isLowStock = p.stock <= 5
          const isOutOfStock = p.stock === 0

          return (
            <div key={p.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
              {/* Image with zoom effect */}
              <div className="relative h-48 w-full rounded-xl overflow-hidden mb-4 bg-slate-950 shadow-inner group">
                <img 
                  src={getProductImage(p)} 
                  alt={p.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = getProductImage({ category: p.category })
                  }}
                />
                {/* Category tag floating */}
                <span className="absolute top-3 left-3 text-[10px] bg-slate-950/80 backdrop-blur-md text-indigo-300 px-2.5 py-1 rounded-full border border-white/10 font-extrabold uppercase tracking-wide shadow-md">
                  {p.category}
                </span>
              </div>

              {/* Product Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-lg text-gray-100 group-hover:text-white transition-colors">
                    {p.name}
                  </h3>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{p.price?.toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>
                <div className="text-[11px] text-gray-400 font-medium mt-3 flex items-center justify-between">
                  <div>
                    <span>🏪 Seller: </span>
                    <span className="text-indigo-300 font-bold">{p.sellerName || p.shopName || 'Local Seller'}</span>
                  </div>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded">
                    📈 Top Demand
                  </span>
                </div>
              </div>

              {/* Actions & Stock Bar */}
              <div className="mt-5 border-t border-white/5 pt-4">
                {/* Stock dynamic visualization bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-gray-500">Stock Availability</span>
                    <span className={isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'}>
                      {isOutOfStock ? 'Out of Stock' : `${p.stock} left`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((p.stock / 20) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={orderQuantities[p.id] || 1}
                      onChange={(e) => setOrderQuantities((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 1 }))}
                      className="w-14 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white text-center focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <button 
                      onClick={() => addToCart(p)}
                      disabled={isOutOfStock}
                      className="bg-indigo-600 border border-indigo-500/20 text-white px-3.5 py-2 rounded-lg text-xs font-extrabold hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all cursor-pointer shadow-md"
                    >
                      🛒 Add to Cart
                    </button>
                    <button 
                      onClick={() => placeOrder(p)}
                      disabled={isOutOfStock}
                      className="bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-lg text-xs font-extrabold hover:bg-emerald-600 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-30 transition-all cursor-pointer shadow-md"
                    >
                      ⚡ Quick Buy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-12">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)} 
            className="px-4 py-2 bg-slate-900/60 border border-white/5 rounded-lg disabled:opacity-40 hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-gray-500 bg-slate-900/40 px-3 py-1.5 rounded-lg border border-white/5">
            Page {page + 1} of {totalPages}
          </span>
          <button 
            disabled={page >= totalPages - 1} 
            onClick={() => setPage(page + 1)} 
            className="px-4 py-2 bg-slate-900/60 border border-white/5 rounded-lg disabled:opacity-40 hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
