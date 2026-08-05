/**
 * AI Smart Search Page
 * ====================
 * Captures user search query and browser location parameters to invoke
 * OpenAI-powered and location-sorted product matching algorithms on the backend.
 */

import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import api from '../api/axios'
import SellerMap from '../components/SellerMap'
import { addItem } from '../store/cartSlice'
import { useToast } from '../components/Toast'
import RecipeBundleWidget from '../components/RecipeBundleWidget'

export default function AiSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState('')
  const [timeOfDay, setTimeOfDay] = useState('')
  const [weatherStatus, setWeatherStatus] = useState('') // status text for UI

  // Voice Copilot States
  const [isListening, setIsListening] = useState(false)
  const [voiceFeedback, setVoiceFeedback] = useState('')

  const dispatch = useDispatch()
  const locationState = useLocation()
  const toast = useToast()

  const searchParams = new URLSearchParams(locationState.search)
  const qParam = searchParams.get('q')

  useEffect(() => {
    if (qParam) {
      setQuery(qParam)
      executeSearch(qParam)
    }
  }, [qParam])

  // Web Speech Synthesis (Text to Speech Audio Response)
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      window.speechSynthesis.speak(utterance)
    }
  }

  const fetchRealWeather = async (lat, lng) => {
    setWeatherStatus('Fetching live weather...')
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`)
      const data = await response.json()
      if (data && data.current_weather) {
        const temp = data.current_weather.temperature
        const code = data.current_weather.weathercode
        
        // WMO Weather interpretation codes indicating rain
        const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99].includes(code)
        
        let detected = 'sunny'
        if (isRainy) {
          detected = 'rainy'
        } else if (temp < 15) {
          detected = 'cold'
        } else if (temp > 28) {
          detected = 'hot'
        }
        
        setWeather(detected)
        setWeatherStatus(`Loaded local weather: ${temp}°C (${detected.toUpperCase()})`)
        toast(`Loaded local weather: ${temp}°C, Auto-categorized as ${detected}!`, 'success')
      }
    } catch (err) {
      console.error('Failed to load weather from Open-Meteo:', err)
      setWeatherStatus('Failed to load live weather.')
    }
  }

  // Load user coordinates and fetch live weather on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setLocation({ lat, lng })
          fetchRealWeather(lat, lng)
        },
        () => {
          setWeatherStatus('Geolocation access denied.')
        }
      )
    } else {
      setWeatherStatus('Geolocation not supported.')
    }
  }, [])

  /**
   * Prompts user geolocation inputs and submits criteria to recommendations search endpoint.
   */
  const executeSearch = async (overrideQuery = null, overrideWeather = null) => {
    setLoading(true)
    let lat = location?.lat
    let lng = location?.lng
    
    // Request coordinates context if not already saved in local state
    if (!lat && navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        setLocation({ lat, lng })
        fetchRealWeather(lat, lng) // load weather for newly resolved coordinates
      } catch {
        // Geolocation block - ignore and perform search without proximity inputs
      }
    }
    
    const activeQuery = overrideQuery !== null ? overrideQuery : query
    const activeWeather = overrideWeather !== null ? overrideWeather : weather
    const params = new URLSearchParams({ q: activeQuery })
    if (lat) params.set('lat', lat)
    if (lng) params.set('lng', lng)
    if (activeWeather) params.set('weather', activeWeather)
    if (timeOfDay) params.set('timeOfDay', timeOfDay)
    
    try {
      const { data } = await api.get(`/ai/search?${params}`)
      setResults(data)
      return data
    } catch (err) {
      console.error(err)
      toast('AI Search failed. Please try again.', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  const search = (overrideQuery = null) => executeSearch(overrideQuery)

  // Trigger search whenever weather or time of day changes to update recommendations dynamically
  useEffect(() => {
    search(query)
  }, [weather, timeOfDay])

  /**
   * Adds the recommended product to the local Redux cart store.
   * Conforms to the nested { product, sellerId, quantity } cart structure.
   */
  const addRecommendationToCart = (product) => {
    dispatch(addItem({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        sellerName: product.sellerName || 'Local Seller',
      },
      sellerId: product.sellerId,
      quantity: 1,
    }))
    toast(`${product.name} added to cart.`, 'success')
  }

  /**
   * AI Voice Copilot Intent Handler & Speech Recognition Engine
   */
  const handleVoiceCommand = async (spokenText) => {
    const txt = spokenText.toLowerCase().trim()
    setVoiceFeedback(`Captured: "${spokenText}"`)
    toast(`🎙️ Voice Copilot Heard: "${spokenText}"`, 'info')

    // Symptom Intent: Headache / Pain / Sick
    if (txt.includes('headache') || txt.includes('pain') || txt.includes('sick') || txt.includes('fever') || txt.includes('medicine')) {
      setQuery('medicine paracetamol')
      speak("I understand. Searching local pharmacies for medical supplies.")
      const data = await executeSearch('medicine paracetamol')
      if (data?.recommendations?.length > 0) {
        const topItem = data.recommendations[0]
        addRecommendationToCart(topItem)
        speak(`Added ${topItem.name} to your cart. Get well soon!`)
      }
      return
    }

    // Weather/Feeling Intent: Freezing / Cold
    if (txt.includes('freezing') || txt.includes('cold weather') || txt.includes('chilly') || txt.includes('cold')) {
      setWeather('cold')
      setQuery('hot tea coffee')
      speak("It's cold out! Finding hot beverages for you.")
      const data = await executeSearch('hot tea coffee', 'cold')
      if (data?.recommendations?.length > 0) {
        const topItem = data.recommendations[0]
        addRecommendationToCart(topItem)
        speak(`Added ${topItem.name} to your cart!`)
      }
      return
    }

    // Hunger Intent: Hungry / Food
    if (txt.includes('hungry') || txt.includes('snack') || txt.includes('food')) {
      setQuery('snacks bakery')
      speak("Looking for fresh snacks and bakery items nearby.")
      executeSearch('snacks bakery')
      return
    }

    // Purchase Intent: "Add [item] to cart" or "buy [item]"
    const addMatch = txt.match(/(?:add|buy|get)\s+(.*?)(?:\s+to\s+(?:my\s+)?cart)?$/i)
    if (addMatch && addMatch[1]) {
      let itemName = addMatch[1].replace(/to\s+(my\s+)?cart/g, '').trim()
      if (itemName && itemName !== 'this' && itemName !== 'it') {
        speak(`Searching for ${itemName} to add to your cart.`)
        setQuery(itemName)
        const data = await executeSearch(itemName)
        if (data?.recommendations?.length > 0) {
          const topItem = data.recommendations[0]
          addRecommendationToCart(topItem)
          speak(`Added ${topItem.name} to your cart!`)
        } else {
          speak(`Sorry, no items found for ${itemName}.`)
        }
        return
      }
    }

    // General Search Intent
    let searchItem = txt.replace(/^search\s+(for\s+)?/i, '').replace(/^find\s+/i, '').replace(/^look\s+for\s+/i, '')
    if (!searchItem) searchItem = txt

    setQuery(searchItem)
    speak(`Searching local marketplace for ${searchItem}.`)
    executeSearch(searchItem)
  }

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast('Web Speech Recognition API is not supported in this browser.', 'error')
      speak('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setVoiceFeedback('Listening... Speak now!')
        toast('🎙️ Voice Copilot is listening...', 'info')
      }

      recognition.onresult = (event) => {
        setIsListening(false)
        const transcriptText = event.results[0][0].transcript
        handleVoiceCommand(transcriptText)
      }

      recognition.onerror = (event) => {
        setIsListening(false)
        setVoiceFeedback('Voice recognition error: ' + event.error)
        toast('Voice recognition error: ' + event.error, 'error')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch (err) {
      setIsListening(false)
      console.error('Speech recognition failed:', err)
    }
  }

  const quickSearch = (term) => {
    setQuery(term)
    // Run search in next tick after state updates
    setTimeout(() => {
      search(term)
    }, 50)
  }

  return (
    <div className="relative">
      <div className="mb-8">
        <span className="text-xs bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          ✨ Neural Search & Voice Copilot
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">AI Smart Search & Voice Copilot</h2>
        <p className="text-gray-400 text-sm">Location-aware product recommendations with interactive AI voice commands</p>
      </div>

      {/* 🍳 AI Recipe-to-Cart 1-Click Bundler */}
      <RecipeBundleWidget />

      {/* Interactive Environment Simulation Controls */}
      <div className="glass-card p-5 mb-6 font-Outfit space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider">⛅ Environment Simulator</h3>
          {weatherStatus && (
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-bold">
              {weatherStatus}
            </span>
          )}
          <span className="text-[10px] text-gray-500 font-bold">Simulate real-world conditions to test AI recommendations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weather Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-gray-400">Current Weather</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '', label: 'None ⚪' },
                { id: 'cold', label: 'Cold ❄️' },
                { id: 'hot', label: 'Hot ☀️' },
                { id: 'rainy', label: 'Rainy 🌧️' },
                { id: 'sunny', label: 'Sunny 🌤️' }
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    weather === w.id 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                      : 'bg-slate-900 border-white/5 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Time of Day Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-gray-400">Time of Day</span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: '', label: 'None ⚪' },
                { id: 'morning', label: 'Morning 🌅' },
                { id: 'afternoon', label: 'Afternoon ☀️' },
                { id: 'evening', label: 'Evening 🌇' },
                { id: 'night', label: 'Night 🌙' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeOfDay(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    timeOfDay === t.id 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                      : 'bg-slate-900 border-white/5 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Search Input Bar with Voice Microphone */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products... or click 🎙️ for AI Voice Copilot"
            className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl pl-4 pr-12 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-inner text-sm" 
            onKeyDown={(e) => e.key === 'Enter' && search()} 
          />
          <button
            onClick={toggleListening}
            title="Start Voice Copilot"
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer text-sm ${
              isListening 
                ? 'bg-red-500 text-white animate-bounce shadow-lg shadow-red-500/50 ring-2 ring-red-400' 
                : 'bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-300 hover:text-white border border-indigo-500/30'
            }`}
          >
            🎙️
          </button>
        </div>
        <button 
          id="ai-search-submit"
          onClick={() => search()} 
          disabled={loading}
          className="btn-neon text-white px-8 py-3.5 rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : 'Search'}
        </button>
      </div>

      {/* Listening Feedback Indicator */}
      {isListening && (
        <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/40 rounded-xl p-3 mb-4 flex items-center justify-between animate-pulse text-xs font-bold text-red-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>🎙️ AI Voice Copilot Listening... Speak your request! (e.g. "Add milk to cart", "I have a headache")</span>
          </div>
          <button onClick={() => setIsListening(false)} className="text-red-400 hover:text-white font-mono text-xs cursor-pointer">Stop ✖</button>
        </div>
      )}

      {/* Quick Voice Shortcut Buttons */}
      <div className="flex flex-wrap gap-2 items-center mb-8 text-xs font-Outfit">
        <span className="text-slate-800 dark:text-gray-200 font-extrabold">Try Voice Commands 🎙️:</span>
        {[
          { label: '🗣️ "Add milk to cart"', cmd: 'add milk to cart' },
          { label: '🗣️ "I have a headache"', cmd: 'I have a headache' },
          { label: '🗣️ "It is freezing today"', cmd: 'It is freezing today' },
          { label: '🗣️ "I am hungry"', cmd: 'I am hungry' }
        ].map((vc, idx) => (
          <button
            key={idx}
            onClick={() => handleVoiceCommand(vc.cmd)}
            className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white px-3 py-1.5 rounded-full transition-all cursor-pointer font-extrabold shadow-sm"
          >
            {vc.label}
          </button>
        ))}
      </div>

      {/* Interactive Quick-Fill Helper Chips */}
      <div className="flex flex-wrap gap-2 items-center mb-10 text-xs font-Outfit">
        <span className="text-slate-800 dark:text-gray-200 font-extrabold">Try searching:</span>
        {['fresh vegetables', 'bakery item', 'electronics', 'milk and dairy', 'snacks'].map((term) => (
          <button
            key={term}
            onClick={() => quickSearch(term)}
            className="bg-slate-800 dark:bg-slate-900 border border-indigo-400/30 text-white hover:bg-indigo-600 px-3 py-1.5 rounded-full transition-all cursor-pointer font-bold shadow-sm"
          >
            {term}
          </button>
        ))}
      </div>

      {results && (
        <>
          {/* Natural Language OpenAI Insight */}
          {results.aiInsight && (
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/5 border border-indigo-500/20 rounded-2xl p-5 mb-8 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 text-3xl opacity-10 p-4">🤖</div>
              <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-2">AI Copilot Analysis</h4>
              <p className="text-indigo-200 text-sm font-medium leading-relaxed">{results.aiInsight}</p>
              <div className="text-[10px] text-indigo-400/80 mt-3 font-semibold">
                Engine: <span className="text-pink-400">{results.source}</span>
              </div>
            </div>
          )}
          
          <h3 className="font-extrabold text-lg mb-4 text-gray-200">Neural-Scored Recommendations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {(results.recommendations || []).map((p) => (
              <div key={p.id} className="glass-card p-4 rounded-xl flex flex-col justify-between relative overflow-hidden group">
                <div>
                  {/* Image banner */}
                  <div className="relative h-28 w-full rounded-lg overflow-hidden mb-3 bg-slate-950">
                    {p.imageUrl ? (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/60 text-lg">
                        <span>🛍️</span>
                        <span className="text-[8px] mt-1 font-bold text-slate-600 uppercase">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="font-bold text-gray-100 group-hover:text-white transition-colors line-clamp-1 text-sm">{p.name}</h4>
                    <span className="text-pink-400 font-black font-mono text-xs">${p.price?.toFixed(2)}</span>
                  </div>
                  <p className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 inline-block font-extrabold uppercase tracking-wide mb-2">{p.category}</p>
                  <p className="text-gray-400 text-[11px] line-clamp-2 leading-relaxed">{p.description || 'No description available.'}</p>
                </div>
                <button
                  onClick={() => addRecommendationToCart(p)}
                  className="mt-4 bg-indigo-600 border border-indigo-500/20 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            ))}
            {(results.recommendations || []).length === 0 && (
              <div className="col-span-full bg-slate-900/40 border border-white/5 p-8 rounded-xl text-center text-gray-500 text-sm">
                No matching product recommendations found. Try a different query terms.
              </div>
            )}
          </div>

          {/* Proximity maps and list of sellers */}
          {results.nearbySellers && results.nearbySellers.length > 0 && (
            <>
              <h3 className="font-extrabold text-lg mb-4 text-gray-200">Verified Nearby Sellers</h3>
              <div className="rounded-2xl overflow-hidden border border-white/5 shadow-xl bg-slate-950 p-2">
                <SellerMap sellers={results.nearbySellers} center={location} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {results.nearbySellers.map((s, i) => {
                  const seller = s.seller || s
                  const isVeryClose = s.distanceKm < 1.0
                  return (
                    <div key={i} className="glass-card p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <strong className="text-gray-100 text-base">{seller.shopName}</strong>
                        {s.distanceKm != null && (
                          <span className={`font-black text-xs px-2.5 py-1 rounded-full border ${isVeryClose ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                            {s.distanceKm.toFixed(2)} km away
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{seller.address}</p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
