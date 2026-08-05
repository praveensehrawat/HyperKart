import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { addItem } from '../store/cartSlice'
import { useToast } from '../components/Toast'

/**
 * AI Buyer Assistant & Support Chatbot
 * ====================================
 * Clean, interactive assistant for order tracking, stock lookup,
 * payments & local merchant support with minimal, tasteful emoji accents.
 */
export default function AiBuyerChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello! I am your AI Commerce Assistant. How can I help you today? Select a topic below or type your request:",
      products: [],
      quickOptions: [
        'Track My Active Order',
        'Find Nearby Stock & Items',
        'Payment & Refund Help',
        'Contact Local Merchant'
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)

  const messagesEndRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()

  // Auto-scroll chat window to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) scrollToBottom()
  }, [messages, isOpen])

  // Get buyer's GPS coordinates and live weather on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current_weather=true`)
            const data = await res.json()
            if (data?.current_weather) {
              const temp = data.current_weather.temperature
              const code = data.current_weather.weathercode
              const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)
              setWeather(isRainy ? 'rainy' : temp < 15 ? 'cold' : temp > 28 ? 'hot' : 'sunny')
            }
          } catch (e) {}
        },
        () => setLocation({ lat: 30.6425, lng: 76.8173 })
      )
    }
  }, [])

  // Web Speech Synthesis Text-to-Speech Output
  const speakText = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*#_~]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }

  // Web Speech Recognition Voice Input
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast('Voice input is not supported in your browser.', 'error')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = false

      recognition.onstart = () => {
        setIsListening(true)
        toast('🎙️ Listening... Speak your question clearly!', 'info')
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
        handleSendMessage(transcript)
      }

      recognition.onerror = () => {
        setIsListening(false)
        toast('Voice input error. Please try typing.', 'error')
      }

      recognition.onend = () => setIsListening(false)
      recognition.start()
    } catch (e) {
      setIsListening(false)
    }
  }

  // Send message to AI endpoint or handle support intent locally
  const handleSendMessage = async (customQuery = null) => {
    const queryText = customQuery || input
    if (!queryText.trim() || loading) return

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customQuery) setInput('')
    setLoading(true)

    // Check for specific support problem intents
    const lower = queryText.toLowerCase()

    if (lower.includes('track') || lower.includes('order') || lower.includes('delivery')) {
      try {
        const { data: orders } = await api.get('/orders/buyer')
        if (orders && orders.length > 0) {
          const latest = orders[0]
          const aiMsg = {
            id: Date.now() + 1,
            sender: 'ai',
            text: `Your latest Order #${latest.id?.substring(0, 8)} is currently [${latest.status || 'PROCESSING'}]. Total Amount: ₹${latest.totalAmount || 0}.`,
            products: [],
            quickOptions: ['View Full Order History', 'Contact Local Merchant', 'Find Nearby Stock & Items'],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          setMessages((prev) => [...prev, aiMsg])
          speakText(aiMsg.text)
          setLoading(false)
          return
        }
      } catch (e) {}

      const noOrderMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "You have no active orders in progress right now. You can explore nearby local merchants to place an order.",
        products: [],
        quickOptions: ['Find Nearby Stock & Items', 'Payment & Refund Help'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, noOrderMsg])
      speakText(noOrderMsg.text)
      setLoading(false)
      return
    }

    if (lower.includes('payment') || lower.includes('refund') || lower.includes('money')) {
      const paymentMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Payment & Refund Support:\n1. Cash on Delivery (COD) & Online UPI are supported.\n2. For cancelled orders, refunds are credited back within 24 hours.\n3. Need escalation? All transactions are covered by Buyer Protection.",
        products: [],
        quickOptions: ['Track My Active Order', 'Contact Local Merchant'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, paymentMsg])
      speakText(paymentMsg.text)
      setLoading(false)
      return
    }

    if (lower.includes('contact') || lower.includes('merchant') || lower.includes('seller') || lower.includes('shop')) {
      const merchantMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "You can view verified local sellers on our Interactive Sellers Map to check addresses, phone numbers, and live store inventories.",
        products: [],
        quickOptions: ['Open Sellers Geolocation Map', 'Find Nearby Stock & Items'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, merchantMsg])
      speakText(merchantMsg.text)
      setLoading(false)
      return
    }

    if (queryText.includes('View Full Order History')) {
      navigate('/orders')
      setLoading(false)
      return
    }

    if (queryText.includes('Open Sellers Geolocation Map')) {
      navigate('/sellers')
      setLoading(false)
      return
    }

    // Default AI Search & Recommendation engine
    try {
      const lat = location?.lat || 30.6425
      const lng = location?.lng || 76.8173

      const { data } = await api.get(`/ai/recommendations?query=${encodeURIComponent(queryText)}&lat=${lat}&lng=${lng}&weather=${weather}`)
      const recommendedProducts = data.recommendations || data.content || []
      const aiInsightText = data.insight || data.ai_reasoning || `Found ${recommendedProducts.length} matching items from nearby physical stores.`

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiInsightText,
        products: recommendedProducts.slice(0, 4),
        quickOptions: ['Track My Active Order', 'Payment & Refund Help', 'Contact Local Merchant'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, aiMsg])
      speakText(aiInsightText)
    } catch (err) {
      const fallbackMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "I couldn't process your request right now. Please select one of the support options below.",
        products: [],
        quickOptions: ['Track My Active Order', 'Find Nearby Stock & Items', 'Payment & Refund Help'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages((prev) => [...prev, fallbackMsg])
    } finally {
      setLoading(false)
    }
  }

  // 1-Click Add to Cart from Chat Message
  const handleAddToCart = (product) => {
    dispatch(addItem({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
      },
      sellerId: product.sellerId || 'seller-chawla',
      quantity: 1,
    }))
    toast(`Added "${product.name}" to cart!`, 'success')
  }

  return (
    <div className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-50 font-Outfit">
      {/* Chatbot Toggle Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border border-indigo-400/40 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 group font-bold text-xs"
        >
          <span className="text-base">🤖</span>
          <span>AI Support</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* Floating Chat Modal Window */}
      {isOpen && (
        <div className="!bg-slate-950 border-2 border-indigo-500/50 rounded-3xl w-[92vw] sm:w-[395px] h-[560px] shadow-2xl flex flex-col overflow-hidden !text-white font-Outfit animate-scale-up">
          {/* Header Bar */}
          <div className="!bg-slate-900 px-4 py-3.5 border-b border-indigo-500/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm text-white shadow">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-xs !text-white flex items-center gap-1.5">
                  AI Assistant & Support
                  <span className="text-[9px] !bg-emerald-500/20 !text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-mono font-bold">
                    Online 24/7
                  </span>
                </h3>
                <p className="text-[10px] !text-gray-300">Order Tracking • Nearby Stock • Support</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Voice Output Toggle Button */}
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  voiceEnabled ? '!bg-indigo-600/30 !text-indigo-200 border border-indigo-400/50' : '!bg-slate-800 !text-gray-400'
                }`}
                title={voiceEnabled ? 'Voice Output ON' : 'Voice Output OFF'}
              >
                {voiceEnabled ? '🔊' : '🔇'}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full !bg-slate-800 hover:!bg-rose-600 !text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all shadow"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Problem Category Bar */}
          <div className="px-3 py-2.5 !bg-slate-900/90 border-b border-indigo-500/20 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <button
              onClick={() => handleSendMessage('Track My Active Order')}
              className="!bg-indigo-950 border border-indigo-500/50 !text-indigo-200 hover:!bg-indigo-600 hover:!text-white px-3 py-1 rounded-full whitespace-nowrap font-extrabold transition-all cursor-pointer shadow-sm"
            >
              Track Order
            </button>
            <button
              onClick={() => handleSendMessage('Find Nearby Stock & Items')}
              className="!bg-purple-950 border border-purple-500/50 !text-purple-200 hover:!bg-purple-600 hover:!text-white px-3 py-1 rounded-full whitespace-nowrap font-extrabold transition-all cursor-pointer shadow-sm"
            >
              Nearby Stock
            </button>
            <button
              onClick={() => handleSendMessage('Payment & Refund Help')}
              className="!bg-emerald-950 border border-emerald-500/50 !text-emerald-200 hover:!bg-emerald-600 hover:!text-white px-3 py-1 rounded-full whitespace-nowrap font-extrabold transition-all cursor-pointer shadow-sm"
            >
              Payment & Refund
            </button>
            <button
              onClick={() => handleSendMessage('Contact Local Merchant')}
              className="!bg-amber-950 border border-amber-500/50 !text-amber-200 hover:!bg-amber-600 hover:!text-white px-3 py-1 rounded-full whitespace-nowrap font-extrabold transition-all cursor-pointer shadow-sm"
            >
              Contact Shop
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-4 font-Outfit text-xs !bg-slate-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl shadow-xl ${
                    msg.sender === 'user'
                      ? '!bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 !text-white rounded-tr-none font-bold'
                      : '!bg-slate-900 border border-indigo-500/40 !text-white rounded-tl-none space-y-3 font-semibold'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line !text-white font-semibold text-xs">{msg.text}</p>

                  {/* Quick Option Choice Buttons inside AI Message */}
                  {msg.quickOptions && msg.quickOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
                      {msg.quickOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(opt)}
                          className="!bg-indigo-600 hover:!bg-indigo-500 border border-indigo-400 !text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md text-left flex items-center justify-between"
                        >
                          <span>{opt}</span>
                          <span className="text-[10px]">→</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Embedded Interactive Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="grid gap-2 pt-2 border-t border-slate-800">
                      {msg.products.map((p) => (
                        <div
                          key={p.id}
                          className="!bg-slate-950 border border-indigo-500/50 p-3 rounded-xl flex items-center justify-between gap-2 shadow-md"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img
                              src={p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150'}
                              alt={p.name}
                              className="w-11 h-11 object-cover rounded-lg border border-slate-700 shrink-0"
                            />
                            <div className="truncate">
                              <div className="font-extrabold text-xs !text-white truncate">{p.name}</div>
                              <div className="text-xs !text-emerald-400 font-mono font-extrabold mt-0.5">₹{p.price}</div>
                              <div className="text-[10px] !text-indigo-300 font-mono font-bold">
                                {p.stock} in stock
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddToCart(p)}
                            className="!bg-emerald-500 hover:!bg-emerald-400 !text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                          >
                            Add to Cart
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] !text-gray-400 font-mono mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 !text-indigo-300 text-xs p-2.5 !bg-slate-900 rounded-xl border border-indigo-500/40 w-fit animate-pulse font-mono shadow">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Processing request...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Control & Input Bar */}
          <div className="p-3 !bg-slate-900 border-t border-indigo-500/30">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={startVoiceInput}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isListening
                    ? '!bg-rose-500/20 border-rose-500/40 !text-rose-400 animate-pulse'
                    : '!bg-slate-950 border-slate-700 !text-indigo-300 hover:!text-white'
                }`}
                title="Voice Input"
              >
                🎙️
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your issue or question..."
                className="flex-1 !bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-xs !text-white placeholder-gray-400 font-semibold outline-none font-Outfit"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="!bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 !text-white px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow flex items-center justify-center"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
