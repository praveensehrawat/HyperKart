import { useMemo, useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api/axios'
import { clearCart } from '../store/cartSlice'
import { useToast } from '../components/Toast'

export default function Checkout() {
  const cartItems = useSelector((s) => s.cart.items)
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Require user authentication for checkout
  useEffect(() => {
    if (!user) {
      toast('You need to login first to proceed to checkout', 'warning', 5000)
      navigate('/login', { state: { redirect: '/cart' } })
    }
  }, [user, navigate, toast])

  // Retrieve pricing breakdown state passed from Cart if available
  const passedState = location.state || {}
  const appliedCoupon = passedState.appliedCoupon || null
  const discountAmount = passedState.discountAmount || 0

  // Form input fields state hooks
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  
  // Card payment states
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)

  // UPI payment states
  const [upiId, setUpiId] = useState('')
  const [selectedWallet, setSelectedWallet] = useState('gpay')
  const [showQr, setShowQr] = useState(false)
  const [upiSimulating, setUpiSimulating] = useState(false)
  const [upiProgress, setUpiProgress] = useState(0)

  // COD captcha states
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Sandbox Payment Gateway States
  const [sandboxOrders, setSandboxOrders] = useState([])
  const [showSandbox, setShowSandbox] = useState(false)
  const [sandboxStep, setSandboxStep] = useState(0) // 1: connecting, 2: processing, 3: success, 4: failed
  const [sandboxProgress, setSandboxProgress] = useState(0)
  const [sandboxStatusText, setSandboxStatusText] = useState('')

  const runSandboxSimulation = (orderIds) => {
    setSandboxStep(1)
    setSandboxProgress(10)
    setSandboxStatusText('Contacting ApexPay Gateway secure endpoints...')
    
    setTimeout(() => {
      setSandboxStep(2)
      setSandboxProgress(45)
      setSandboxStatusText('Authenticating 3D-Secure credentials and banking tokens...')
      
      setTimeout(() => {
        setSandboxProgress(75)
        setSandboxStatusText('Verifying merchant ledger credit status and holds...')
        
        setTimeout(() => {
          setSandboxProgress(100)
          setSandboxStatusText('Transaction authorized! Secure validation tokens generated.')
        }, 800)
      }, 800)
    }, 800)
  }

  const completePayment = async (orderIds) => {
    setSandboxStatusText('Updating ledger payment status to PAID on database...')
    try {
      // Make backend API calls to update the paymentStatus to PAID
      await Promise.all(
        orderIds.map((id) =>
          api.patch(`/orders/${id}/payment-status?paymentStatus=PAID`)
        )
      )
      setSandboxStep(3) // Success
      setSuccess('Transaction authorized! Order payment verified.')
      setTimeout(() => {
        navigate('/orders')
      }, 1500)
    } catch (err) {
      setSandboxStep(4) // Failed
      setSandboxStatusText(err.response?.data?.message || err.response?.data?.error || 'Failed to update ledger status.')
    }
  }

  const cancelPayment = () => {
    setSandboxStep(4)
    setSandboxStatusText('Transaction cancelled or declined by client.')
    setTimeout(() => {
      navigate('/orders')
    }, 1200)
  }

  // Calculate total order amount across all items in the cart
  const total = useMemo(() => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [cartItems])

  // Group items by seller so separate orders can be created for each merchant
  const groupedOrders = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const sellerId = item.sellerId || 'unknown'
      if (!acc[sellerId]) {
        acc[sellerId] = { 
          sellerId, 
          sellerName: item.product.sellerName || 'Local Seller', 
          items: [] 
        }
      }
      acc[sellerId].items.push({ productId: item.product.id, quantity: item.quantity })
      return acc
    }, {})
  }, [cartItems])

  // Initialize Captcha for COD
  const generateNewCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaCode(result)
    setCaptchaInput('')
  }

  useEffect(() => {
    generateNewCaptcha()
  }, [])

  // Auto-format card number as they type (adding spaces every 4 digits)
  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    const truncated = val.slice(0, 16)
    const formatted = truncated.match(/.{1,4}/g)?.join(' ') || truncated
    setCardNumber(formatted)
  }

  // Auto-format expiry as they type (MM/YY)
  const handleExpiryChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    const truncated = val.slice(0, 4)
    if (truncated.length > 2) {
      setExpiry(`${truncated.slice(0, 2)}/${truncated.slice(2)}`)
    } else {
      setExpiry(truncated)
    }
  }

  const handleCvcChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    setCvc(val.slice(0, 3))
  }

  const handlePaymentValidation = () => {
    if (!deliveryAddress.trim()) {
      setError('Please enter a delivery address.')
      return false
    }
    if (paymentMethod === 'card') {
      if (!cardName.trim()) {
        setError('Please enter the cardholder name.')
        return false
      }
      if (cardNumber.replace(/\s/g, '').length !== 16) {
        setError('Please enter a valid 16-digit card number.')
        return false
      }
      if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
        setError('Please enter a valid expiry date (MM/YY).')
        return false
      }
      if (cvc.length !== 3) {
        setError('Please enter a valid 3-digit CVC.')
        return false
      }
    }
    if (paymentMethod === 'upi') {
      if (!upiId.trim() && !showQr) {
        setError('Please enter your UPI ID or generate a QR code.')
        return false
      }
      if (upiId.trim() && !upiId.includes('@')) {
        setError('Please enter a valid UPI VPA (e.g. user@okhdfc).')
        return false
      }
    }
    if (paymentMethod === 'cod') {
      if (captchaInput.trim().toUpperCase() !== captchaCode) {
        setError('Security code verification failed. Please try again.')
        generateNewCaptcha()
        return false
      }
    }
    return true
  }

  const checkout = async () => {
    setError(null)
    setSuccess(null)
    if (!cartItems.length) {
      setError('Your cart is empty.')
      return
    }
    if (!handlePaymentValidation()) return

    // Interactive UPI verification simulation
    if (paymentMethod === 'upi' && !showQr) {
      setUpiSimulating(true)
      setUpiProgress(10)
      
      const timer = setInterval(() => {
        setUpiProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer)
            executeCheckout()
            return 100
          }
          return prev + 30
        })
      }, 700)
      return
    }

    executeCheckout()
  }

  const executeCheckout = async () => {
    setLoading(true)
    setUpiSimulating(false)
    try {
      let details = ''
      if (paymentMethod === 'card') {
        details = `Card ending in ${cardNumber.slice(-4)}`
      } else if (paymentMethod === 'upi') {
        details = showQr ? 'UPI scan payment' : `UPI ID: ${upiId}`
      } else {
        details = 'COD validation verified'
      }

      const orderPromises = Object.values(groupedOrders).map((group) => {
        return api.post('/orders', {
          sellerId: group.sellerId,
          deliveryAddress,
          paymentMethod,
          paymentDetails: details,
          items: group.items,
        })
      })

      const responses = await Promise.all(orderPromises)
      const createdOrders = responses.map(r => r.data)
      const orderIds = createdOrders.map(o => o.id)

      dispatch(clearCart())

      if (paymentMethod === 'cod') {
        setSuccess('Transaction completed successfully! Order placed.')
        setTimeout(() => navigate('/orders'), 1200)
      } else {
        // Show Sandbox Payment modal
        setSandboxOrders(createdOrders)
        setShowSandbox(true)
        runSandboxSimulation(orderIds)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Could not complete checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!cartItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-3xl mb-4">🛒</div>
        <h2 className="text-3xl font-extrabold text-gradient mb-2">Checkout</h2>
        <p className="text-gray-400 mb-6 max-w-sm text-sm">Your shopping basket is currently empty. Head back to marketplace to add products.</p>
        <button onClick={() => navigate('/products')} className="btn-neon text-white px-8 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer">
          Browse Products
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <span className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          💳 Secure Payment Gateway
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Complete Checkout</h2>
        <p className="text-gray-400 text-sm">Review purchase items, finalize physical address, and authorize payment.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm font-semibold animate-pulse">{error}</div>}
      {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-4 text-sm font-semibold">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Form controls panel */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-200">Delivery Information</h3>
              <p className="text-gray-400 text-xs mt-0.5">Please provide complete destination address details</p>
            </div>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={3}
              className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm leading-relaxed"
              placeholder="Full Street Name, Block No., Postal Code"
            />
          </div>

          <div className="glass-card p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-200">Choose Payment Method</h3>
              <p className="text-gray-400 text-xs mt-0.5">All transactions are encrypted and authenticated</p>
            </div>

            {/* Selector tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-white/5">
              {[
                { id: 'card', label: '💳 Card' },
                { id: 'upi', label: '📱 UPI' },
                { id: 'cod', label: '💵 COD' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setPaymentMethod(tab.id)
                    setError(null)
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${paymentMethod === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Card UI elements */}
            {paymentMethod === 'card' && (
              <div className="space-y-6 pt-2">
                {/* Visual Card representation */}
                <div className="perspective-1000 w-full h-48 md:h-52">
                  <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front side of Card */}
                    <div className="absolute inset-0 w-full h-full rounded-2xl p-5 text-white bg-gradient-to-br from-indigo-950 via-slate-900 to-pink-950/80 border border-white/10 shadow-2xl backface-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="w-11 h-8 bg-amber-500/20 border border-amber-500/30 rounded-md relative flex items-center justify-center overflow-hidden">
                          <div className="w-6 h-6 border border-amber-500/40 rounded-sm" />
                        </div>
                        <span className="text-xs font-extrabold tracking-widest text-indigo-300">SECURE CARD</span>
                      </div>
                      <div className="text-lg md:text-xl font-mono tracking-widest text-center my-2 text-gray-100">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>
                      <div className="flex justify-between items-end text-xs font-mono">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-gray-400">Card Holder</p>
                          <p className="font-bold truncate max-w-[150px] uppercase text-gray-200">{cardName || 'JANE DOE'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-gray-400">Expires</p>
                          <p className="font-bold text-gray-200">{expiry || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Back side of Card */}
                    <div className="absolute inset-0 w-full h-full rounded-2xl text-white bg-gradient-to-br from-pink-950/30 via-slate-900 to-indigo-950 border border-white/10 shadow-2xl backface-hidden rotate-y-180 flex flex-col justify-between py-5">
                      <div className="w-full h-10 bg-slate-950" />
                      <div className="px-5 flex items-center justify-between gap-4 mt-2">
                        <div className="h-8 bg-white/15 rounded flex-1 px-3 text-[10px] text-gray-300 font-mono flex items-center">
                          AUTHORIZED SIGNATURE
                        </div>
                        <div className="w-14 h-8 bg-white text-slate-950 font-bold font-mono rounded flex items-center justify-center text-sm shadow-inner">
                          {cvc || '•••'}
                        </div>
                      </div>
                      <div className="px-5 text-[8px] text-gray-400 leading-relaxed font-mono">
                        This digital mock is processed securely under sandbox parameters.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Card Holder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      onFocus={() => setIsFlipped(false)}
                      className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      onFocus={() => setIsFlipped(false)}
                      className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono"
                      placeholder="4000 1234 5678 9010"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Expiry Date</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={handleExpiryChange}
                        onFocus={() => setIsFlipped(false)}
                        className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">CVC / CVV</label>
                      <input
                        type="text"
                        value={cvc}
                        onChange={handleCvcChange}
                        onFocus={() => setIsFlipped(true)}
                        onBlur={() => setIsFlipped(false)}
                        className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono text-center"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UPI UI elements */}
            {paymentMethod === 'upi' && (
              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowQr(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${!showQr ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-transparent border-white/5 text-gray-400'}`}
                  >
                    UPI ID / VPA
                  </button>
                  <button
                    onClick={() => setShowQr(true)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${showQr ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-transparent border-white/5 text-gray-400'}`}
                  >
                    Scan QR Code
                  </button>
                </div>

                {!showQr ? (
                  <div className="space-y-4 font-Outfit">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">UPI Virtual Payment Address</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono"
                        placeholder="username@okhdfc"
                      />
                    </div>
                    {/* App choices */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'gpay', name: 'Google Pay', logo: '🟢' },
                        { id: 'phonepe', name: 'PhonePe', logo: '🟣' },
                        { id: 'paytm', name: 'Paytm', logo: '🔵' },
                        { id: 'amazon', name: 'Amazon Pay', logo: '🟡' },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            setSelectedWallet(app.id)
                            const currentUsername = upiId.split('@')[0] || 'user'
                            setUpiId(`${currentUsername}@ok${app.id === 'amazon' ? 'axis' : app.id}`)
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${selectedWallet === app.id ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-gray-400'}`}
                        >
                          <span className="text-lg">{app.logo}</span>
                          <span className="text-[9px] font-bold line-clamp-1">{app.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-slate-950/50 p-6 rounded-2xl border border-white/5 relative">
                    {/* Simulated Glowing QR Code */}
                    <div className="w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none" />
                      {/* Simple CSS-drawn grid representation of QR Code */}
                      <div className="w-full h-full border-4 border-slate-900 flex flex-col justify-between p-1 bg-slate-100">
                        <div className="flex justify-between">
                          <div className="w-8 h-8 bg-slate-900 border-2 border-white" />
                          <div className="w-8 h-8 bg-slate-900 border-2 border-white" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1 items-center justify-center p-2">
                          <div className="w-full h-1 bg-slate-900" />
                          <div className="w-3/4 h-1 bg-slate-900 self-start" />
                          <div className="w-full h-1 bg-slate-900" />
                          <div className="w-1/2 h-1 bg-slate-900 self-end" />
                        </div>
                        <div className="flex justify-between">
                          <div className="w-8 h-8 bg-slate-900 border-2 border-white" />
                          <div className="w-6 h-6 bg-slate-900 flex items-center justify-center text-[8px] text-white font-bold">✔</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 text-center mt-4 font-Outfit">
                      Scan this QR code using any UPI app to pay <strong className="text-pink-400">${(total + 2.99).toFixed(2)}</strong>.
                    </p>
                    <button
                      onClick={executeCheckout}
                      className="mt-4 bg-emerald-600 border border-emerald-500/20 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:scale-105 transition-all cursor-pointer font-Outfit"
                    >
                      💳 Simulate Pay Confirmation
                    </button>
                  </div>
                )}

                {/* Simulated Verification Overlay */}
                {upiSimulating && (
                  <div className="bg-slate-950 border border-indigo-500/30 p-5 rounded-2xl flex flex-col items-center justify-center font-Outfit">
                    <div className="relative w-12 h-12 mb-3">
                      <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full" />
                      <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-xs text-indigo-300 font-bold animate-pulse">Request sent to your mobile device...</p>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3 max-w-[200px]">
                      <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${upiProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COD UI elements */}
            {paymentMethod === 'cod' && (
              <div className="space-y-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-3 font-Outfit">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Security Verification</label>
                    <button 
                      type="button" 
                      onClick={generateNewCaptcha} 
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold bg-transparent cursor-pointer"
                    >
                      🔄 Reload Code
                    </button>
                  </div>
                  
                  {/* Styled Captcha box */}
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-pink-500/20 via-indigo-500/20 to-teal-500/10 border border-white/10 rounded-xl px-6 py-3 font-mono font-black text-xl tracking-widest text-indigo-300 select-none shadow-inner skew-y-3 skew-x-3">
                      {captchaCode}
                    </div>
                    <input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-950 border border-white/15 text-white rounded-xl px-4 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center font-mono font-bold tracking-widest"
                      placeholder="ENTER CODE"
                      maxLength={5}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium leading-relaxed">
                    Type the 5-digit verification captcha above to finalize order validation. No credit card required.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order billing summary panel */}
        <div className="glass-card p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-200">Order Summary</h3>
            <p className="text-gray-400 text-xs mt-0.5">Summary breakdown by merchant marketplace</p>
            
            <div className="space-y-4 mt-4 max-h-[300px] overflow-y-auto pr-1">
              {Object.values(groupedOrders).map((group) => (
                <div key={group.sellerId} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                    <p className="text-xs font-extrabold text-indigo-300">{group.sellerName}</p>
                    <span className="text-[9px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded uppercase font-black tracking-wider font-Outfit">Merchant</span>
                  </div>
                  <ul className="space-y-2 text-xs text-gray-400 font-medium font-Outfit">
                    {group.items.map((item) => {
                      const cartItem = cartItems.find((ci) => ci.product.id === item.productId)
                      return (
                        <li key={item.productId} className="flex justify-between">
                          <span>{cartItem?.product?.name || 'Item'} <span className="text-indigo-400 font-bold">x{item.quantity}</span></span>
                          <span className="font-mono">₹{((cartItem?.product?.price || 0) * item.quantity).toFixed(2)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5 font-Outfit">
            <div className="space-y-2 text-xs font-semibold text-gray-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-gray-200">₹{total.toFixed(2)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-indigo-300">
                <span>GST Tax (5% CGST + SGST)</span>
                <span className="font-mono text-gray-200">₹{((Math.max(0, total - discountAmount)) * 0.05).toFixed(2)}</span>
              </div>

              {/* Distance & ETA Estimation Breakdown */}
              <div className="space-y-1 pt-2 border-t border-white/5 text-[11px]">
                <div className="flex justify-between text-indigo-300 font-semibold">
                  <span>⚡ Est. Distance & Time</span>
                  <span className="font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                    ~{passedState.estimatedDistanceKm || 3.2} km • {passedState.estimatedEtaMins || 25} mins
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Delivery Charge</span>
                  {total > 500 || appliedCoupon?.freeShipping ? (
                    <span className="text-emerald-400 font-bold">FREE (Orders &gt; ₹500)</span>
                  ) : (
                    <span className="font-mono text-gray-200">₹{(passedState.deliveryFee || 35).toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-base font-extrabold text-gray-100 pt-2 border-t border-white/5">
                <span>Total Amount Payable</span>
                <span className="font-mono text-emerald-400 text-lg">
                  ₹{(
                    Math.max(0, total - discountAmount) * 1.05 + 
                    (total > 500 || appliedCoupon?.freeShipping ? 0 : (passedState.deliveryFee || 35))
                  ).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={checkout}
              disabled={loading || upiSimulating}
              className="w-full btn-neon text-white px-6 py-3.5 rounded-xl font-extrabold transition-all text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : 'Confirm & Authorize Pay'}
            </button>
          </div>
        </div>

      </div>

      {showSandbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="glass-card max-w-md w-full p-6 text-center space-y-6 animate-float-slow border-indigo-500/30 ring-2 ring-indigo-500/10">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] bg-pink-500/15 border border-pink-500/20 text-pink-400 px-2.5 py-1 rounded-full font-black tracking-widest uppercase font-Outfit">
                  💳 ApexPay Sandbox Gateway
                </span>
                <span className="text-[9px] bg-slate-800 text-gray-400 px-2 py-0.5 rounded font-black tracking-wider">SANDBOX</span>
              </div>
            </div>

            {/* Price & Summary */}
            <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl space-y-1">
              <span className="text-xs text-gray-500 font-medium font-Outfit">Amount to Pay</span>
              <h3 className="text-3xl font-black text-pink-400 font-mono">${(total + 2.99).toFixed(2)}</h3>
              <p className="text-[9px] text-gray-400 font-Outfit font-semibold leading-relaxed">
                Orders: {sandboxOrders.map(o => `#${o.id?.slice(-6).toUpperCase()}`).join(', ')}
              </p>
            </div>

            {/* Step Content */}
            {sandboxStep < 3 && (
              <div className="space-y-4 font-Outfit">
                {sandboxProgress < 100 ? (
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 border-2 border-indigo-500/10 rounded-full animate-pulse" />
                    <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="text-3xl animate-bounce">⚡</div>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-indigo-300 font-bold animate-pulse">{sandboxStatusText}</p>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${sandboxProgress}%` }} />
                  </div>
                </div>

                {sandboxProgress === 100 && (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => completePayment(sandboxOrders.map(o => o.id))}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-xs font-black hover:scale-105 active:scale-95 transition-all cursor-pointer font-Outfit"
                    >
                      Simulate Success (Paid)
                    </button>
                    <button
                      onClick={cancelPayment}
                      className="flex-1 bg-red-600/20 border border-red-500/30 text-red-400 py-2.5 rounded-lg text-xs font-black hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer font-Outfit"
                    >
                      Simulate Failure (Unpaid)
                    </button>
                  </div>
                )}
              </div>
            )}

            {sandboxStep === 3 && (
              <div className="space-y-3 font-Outfit py-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-2xl animate-pulse">
                  ✔
                </div>
                <h3 className="font-extrabold text-gray-200">Payment Approved</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Sandbox ledger successfully updated. Redirecting to order dashboard...
                </p>
              </div>
            )}

            {sandboxStep === 4 && (
              <div className="space-y-3 font-Outfit py-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400 text-2xl">
                  ✖
                </div>
                <h3 className="font-extrabold text-gray-200">Transaction Failed</h3>
                <p className="text-xs text-gray-400 leading-relaxed text-red-400 font-semibold">
                  {sandboxStatusText || 'Payment simulation aborted. Redirecting...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
