/**
 * HYPERKART SOS Emergency Rapid Dispatch Modal Component
 * =======================================================
 * Allows buyers to trigger a high-priority sub-10 minute emergency dispatch for
 * critical supplies (medicines, inhalers, first-aid, baby formula).
 */

import { useState } from 'react'
import { useToast } from './Toast'
import api from '../api/axios'

export default function SosEmergencyModal({ onClose }) {
  const [category, setCategory] = useState('Prescription Medicine / Inhaler')
  const [address, setAddress] = useState('Flat 402, Block B, Royal Palms Society')
  const [loading, setLoading] = useState(false)
  const [dispatchedOrder, setDispatchedOrder] = useState(null)
  
  const toast = useToast()

  const categories = [
    { name: 'Prescription Medicine / Inhaler', icon: '💊', desc: 'Asthma inhalers, Insulin, Blood Pressure, High Fever' },
    { name: 'First Aid / Bandages & Antiseptic', icon: '🩹', desc: 'Burns, Cuts, Bandages, Antiseptic, Band-Aids' },
    { name: 'Infant Milk Formula & Diapers', icon: '🍼', desc: 'Baby formula powder, Diapers, Emergency Wipes' },
    { name: 'Car Battery Jumper & Flashlight', icon: '⚡', desc: 'Roadside jumper cables, Power bank, Flashlight' },
  ]

  // Play browser Web Audio API siren alert sound
  const playSirenBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // High A note
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.warn('AudioContext not supported')
    }
  }

  const handleTriggerSos = async (e) => {
    e.preventDefault()
    setLoading(true)
    playSirenBeep()

    try {
      const { data } = await api.post('/orders/sos', {
        category,
        address,
      })

      // Artificial delay for siren broadcast sequence
      setTimeout(() => {
        setDispatchedOrder(data)
        setLoading(false)
        playSirenBeep()
        toast('🚨 EMERGENCY SOS DISPATCHED! Drivers within 2km alerted!', 'error')
      }, 700)
    } catch (err) {
      console.error('SOS Dispatch error:', err)
      toast('Failed to trigger emergency dispatch', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-Outfit animate-toast-in">
      <div className="relative w-full max-w-md glass-card bg-slate-900/95 border border-rose-500/50 p-6 rounded-3xl shadow-2xl space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-pulse">🔴</span>
            <div>
              <h3 className="text-lg font-black text-rose-400">RED ALERT 10-MIN SOS</h3>
              <p className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                Sub-10 Minute Guarantee Rapid Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white font-mono font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {!dispatchedOrder ? (
          <form onSubmit={handleTriggerSos} className="space-y-4">
            {/* Category Selectors */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                1. Select Emergency Supplies Required
              </label>
              <div className="space-y-2">
                {categories.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCategory(c.name)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      category === c.name
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-white">{c.name}</h4>
                      <p className="text-[10px] text-gray-400 truncate">{c.desc}</p>
                    </div>
                    {category === c.name && (
                      <span className="text-rose-400 font-bold text-sm">✔</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Address Input */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                2. Emergency Delivery Address (Auto-GPS)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950/80 border border-rose-500/30 text-white font-bold rounded-xl px-4 py-2.5 text-xs focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            {/* Submit Siren Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white py-3.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 tracking-wide uppercase animate-pulse"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Broadcasting 2km Audio Sirens to Active Drivers...</span>
                </>
              ) : (
                <>
                  <span>🚨 Trigger 10-Minute Rapid SOS Dispatch</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Dispatched Countdown State */
          <div className="space-y-4 text-center animate-toast-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-3xl text-rose-400 mx-auto animate-ping">
              🚨
            </div>

            <div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 font-black px-3 py-1 rounded-full uppercase border border-rose-500/30">
                HIGH PRIORITY DRIVER ALARM ACTIVE
              </span>
              <h4 className="text-xl font-extrabold text-white mt-2">Emergency Order Dispatched!</h4>
              <p className="text-xs text-gray-300 mt-1">
                Audio sirens sent to all 24/7 pharmacies & drivers within 2km.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 font-mono space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-sans font-bold block">
                Target Driver Arrival Time
              </span>
              <span className="text-3xl font-black text-rose-400 animate-pulse">09m : 58s</span>
              <span className="text-[10px] text-emerald-400 block font-bold">
                Order ID: {dispatchedOrder.id?.slice(0, 10)} (Handover OTP: {dispatchedOrder.deliveryOtp})
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-extrabold text-xs cursor-pointer"
            >
              Close Window & Monitor Live Tracking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
