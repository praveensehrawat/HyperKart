import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { addItem, removeItem, updateQuantity, saveForLater, moveToCart, removeSavedItem } from '../store/cartSlice'
import { useToast } from '../components/Toast'
import { addMessageListener } from '../lib/socket'
import api from '../api/axios'
import CouponStudentWidget from '../components/CouponStudentWidget'
import { getProductImage } from '../lib/productImages'

export default function Cart() {
  const { items, savedForLater = [], total } = useSelector((s) => s.cart)
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()

  const [recommendations, setRecommendations] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  // Redirect non-buyers
  useEffect(() => {
    if (user && user.role === 'DRIVER') {
      navigate('/driver-dashboard')
    } else if (user && user.role === 'SELLER') {
      navigate('/seller-dashboard')
    } else if (user && user.role === 'ADMIN') {
      navigate('/admin-dashboard')
    }
  }, [user, navigate])

  // Register real-time cart state sync listener
  useEffect(() => {
    const unsubMsg = addMessageListener((msg) => {
      if (msg.type === 'CART_SYNC') {
        dispatch({ type: 'cart/syncCart', payload: msg.payload })
      }
    })
    return () => { unsubMsg() }
  }, [dispatch])

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoadingRecs(true)
        const { data } = await api.get('/products')
        const allProducts = Array.isArray(data) ? data : data.content || []

        const cartProductIds = new Set([
          ...items.map((i) => i.product.id),
          ...savedForLater.map((i) => i.product.id),
        ])

        const filtered = allProducts.filter((p) => !cartProductIds.has(p.id))
        setRecommendations(filtered.slice(0, 4))
      } catch (e) {
        console.error('Failed to fetch recommendations:', e)
      } finally {
        setLoadingRecs(false)
      }
    }
    fetchRecommendations()
  }, [items, savedForLater])

  const handleUpdateQty = (productId, sellerId, newQty) => {
    if (newQty < 1) {
      dispatch(removeItem({ productId, sellerId }))
    } else {
      dispatch(updateQuantity({ productId, sellerId, quantity: newQty }))
    }
  }

  const handleSaveForLater = (productId, sellerId, name) => {
    dispatch(saveForLater({ productId, sellerId }))
    toast(`"${name}" saved for later!`, 'info')
  }

  const handleMoveToCart = (productId, sellerId, name) => {
    dispatch(moveToCart({ productId, sellerId }))
    toast(`"${name}" moved back to shopping bag!`, 'success')
  }

  const handleRemoveSaved = (productId, sellerId, name) => {
    dispatch(removeSavedItem({ productId, sellerId }))
    toast(`"${name}" removed from saved items.`, 'info')
  }

  const handleApplyDiscount = (coupon) => {
    setAppliedCoupon(coupon)
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
  }

  // FINANCIAL BREAKDOWN (INR ₹)
  const subtotal = total
  let discountAmount = 0
  if (appliedCoupon) {
    if (appliedCoupon.discountPct) {
      discountAmount = (subtotal * appliedCoupon.discountPct) / 100
    } else if (appliedCoupon.flatDiscount) {
      discountAmount = Math.min(subtotal, appliedCoupon.flatDiscount)
    }
  }

  const netSubtotal = Math.max(0, subtotal - discountAmount)
  const gstRate = 0.05 // 5% GST (2.5% CGST + 2.5% SGST)
  const cgst = netSubtotal * 0.025
  const sgst = netSubtotal * 0.025
  const totalGst = netSubtotal * gstRate

  // Dynamic distance-based delivery fee & ETA estimation
  const estimatedDistanceKm = items.length > 0 ? 3.2 : 0
  let calculatedDeliveryFee = 20
  let estimatedEtaMins = 18

  if (estimatedDistanceKm <= 2.0) {
    calculatedDeliveryFee = 20
    estimatedEtaMins = 18
  } else if (estimatedDistanceKm <= 5.0) {
    calculatedDeliveryFee = 35
    estimatedEtaMins = 25
  } else if (estimatedDistanceKm <= 10.0) {
    calculatedDeliveryFee = 50
    estimatedEtaMins = 35
  } else if (estimatedDistanceKm > 10.0) {
    calculatedDeliveryFee = 90
    estimatedEtaMins = 45
  }

  const deliveryFee = appliedCoupon?.freeShipping || netSubtotal > 500 || netSubtotal === 0 ? 0 : calculatedDeliveryFee
  const grandTotal = netSubtotal + totalGst + deliveryFee

  const handleCheckout = () => {
    if (!user) {
      toast('You need to login first to proceed to checkout', 'warning', 5000)
      navigate('/login', { state: { redirect: '/cart' } })
      return
    }
    navigate('/checkout', {
      state: {
        appliedCoupon,
        discountAmount,
        totalGst,
        deliveryFee,
        estimatedDistanceKm,
        estimatedEtaMins,
        grandTotal,
      },
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-Outfit">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
            🛍️ HYPERKART Bag
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gradient">Your Shopping Bag</h1>
        </div>
        <Link to="/products" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
          ← Continue Shopping Catalog
        </Link>
      </div>

      {items.length === 0 && savedForLater.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4 rounded-2xl">
          <div className="text-5xl animate-bounce">🛒</div>
          <h2 className="text-xl font-bold text-gray-200">Your shopping bag is completely empty</h2>
          <p className="text-gray-400 text-xs max-w-sm mx-auto">
            Discover fresh groceries, daily essentials, and local Kirana store items delivered to your doorstep in minutes.
          </p>
          <Link to="/products" className="btn-neon text-white px-6 py-3 rounded-xl font-extrabold text-xs inline-block shadow-lg">
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <span>📦</span> Active Bag Items ({items.reduce((sum, i) => sum + i.quantity, 0)})
              </h2>

              {items.length === 0 ? (
                <div className="glass-card p-6 text-center text-gray-400 text-xs rounded-xl">
                  No active items in bag. Check your saved items below!
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.product.id}-${item.sellerId}`} className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/10 shadow-md">
                        <img 
                          src={getProductImage(item.product)} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = getProductImage({ name: item.product.name })
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-gray-100">{item.product.name}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Merchant: <span className="text-indigo-400 font-semibold">{item.product.sellerName || item.sellerId}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-black text-emerald-400 font-mono">₹{item.product.price?.toFixed(2)}</span>
                          {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                            <span className="text-xs font-mono text-gray-500 line-through">₹{item.product.originalPrice.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-white/5">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, item.sellerId, item.quantity - 1)}
                          className="w-8 h-8 rounded-md bg-transparent text-gray-400 hover:text-white flex items-center justify-center font-bold"
                        >-</button>
                        <span className="w-8 text-center font-bold text-sm text-gray-200">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, item.sellerId, item.quantity + 1)}
                          className="w-8 h-8 rounded-md bg-transparent text-gray-400 hover:text-white flex items-center justify-center font-bold"
                        >+</button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSaveForLater(item.product.id, item.sellerId, item.product.name)}
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-bold bg-slate-900/80 border border-indigo-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <span>🔖</span> Save for Later
                        </button>
                        <button
                          onClick={() => dispatch(removeItem({ productId: item.product.id, sellerId: item.sellerId }))}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1.5"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PROMO COUPONS & 🎓 STUDENT DISCOUNT WIDGET */}
            <CouponStudentWidget
              onApplyDiscount={handleApplyDiscount}
              appliedCoupon={appliedCoupon}
              onRemoveCoupon={handleRemoveCoupon}
            />

            {/* Saved For Later Section */}
            {savedForLater.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                  <span>🔖</span> Saved for Later ({savedForLater.length})
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {savedForLater.map((sItem, idx) => (
                    <div key={`saved-${sItem.product.id}-${sItem.sellerId}-${idx}`} className="glass-card p-4 rounded-2xl flex flex-col justify-between border-amber-500/10">
                      <div className="flex gap-3 items-start">
                        <div className="w-16 h-16 bg-slate-950 border border-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                          {sItem.product.image ? (
                            <img src={sItem.product.image} alt={sItem.product.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <span className="text-gray-500 text-[10px] font-bold font-mono">SAVED</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-gray-200 truncate">{sItem.product.name}</h4>
                          <p className="text-[11px] text-gray-400">Merchant: {sItem.product.sellerName || sItem.sellerId}</p>
                          <p className="text-base font-black text-emerald-400 font-mono mt-1">₹{sItem.product.price.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 justify-between">
                        <button
                          onClick={() => handleMoveToCart(sItem.product.id, sItem.sellerId, sItem.product.name)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-md"
                        >
                          <span>🛒</span> Move to Cart
                        </button>
                        <button
                          onClick={() => handleRemoveSaved(sItem.product.id, sItem.sellerId, sItem.product.name)}
                          className="text-gray-400 hover:text-rose-400 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FINANCIAL SUMMARY & GST TAX CARD */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24 space-y-5 rounded-2xl border border-indigo-500/20 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-200">Financial Order Summary</h2>

              <div className="space-y-3 text-xs font-semibold text-gray-400">
                <div className="flex justify-between">
                  <span>Subtotal ({items.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
                  <span className="font-mono text-gray-200">₹{subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="space-y-1 pt-2 border-t border-white/5 text-[11px]">
                  <div className="flex justify-between text-gray-400">
                    <span>CGST (2.5%)</span>
                    <span className="font-mono text-gray-300">₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>SGST (2.5%)</span>
                    <span className="font-mono text-gray-300">₹{sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300 font-bold">
                    <span>Total GST (5%)</span>
                    <span className="font-mono">₹{totalGst.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  <div className="flex justify-between text-[11px] text-indigo-300 font-semibold">
                    <span>⚡ Est. Distance & Time</span>
                    <span className="font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">~{estimatedDistanceKm} km • {estimatedEtaMins} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge</span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-400 font-bold">FREE (Orders &gt; ₹500)</span>
                    ) : (
                      <span className="font-mono text-gray-300">₹{deliveryFee.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex justify-between text-base font-extrabold text-gray-100">
                  <span>Grand Total Payable</span>
                  <span className="font-mono text-emerald-400 text-xl">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0}
                className={`w-full py-3.5 rounded-xl font-extrabold transition-all text-sm ${
                  items.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'btn-neon text-white cursor-pointer shadow-xl hover:scale-102'
                }`}
              >
                Proceed to Checkout (₹{grandTotal.toFixed(2)})
              </button>

              <p className="text-center text-xs font-semibold">
                <Link to="/products" className="text-gray-500 hover:text-gray-400">← Continue Shopping</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}