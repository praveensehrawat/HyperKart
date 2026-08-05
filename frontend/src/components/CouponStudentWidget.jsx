/**
 * Promo Coupons & 🎓 Student Offer Widget Component
 * ===================================================
 * Renders interactive coupon code entry box, preset promo chips,
 * and 1-Tap Student Discount Offer toggle (15% OFF).
 */

import { useState } from 'react'
import { soundFx } from '../lib/soundFx'
import { useToast } from './Toast'

export default function CouponStudentWidget({ onApplyDiscount, appliedCoupon, onRemoveCoupon }) {
  const [couponInput, setCouponInput] = useState('')
  const [isStudentVerified, setIsStudentVerified] = useState(false)
  const toast = useToast()

  const availableCoupons = [
    { code: 'WELCOME20', label: '20% OFF', desc: 'New User Bonus', discountPct: 20 },
    { code: 'HYPER50', label: '₹50 OFF', desc: 'Flat INR Discount', flatDiscount: 50 },
    { code: 'STUDENT15', label: '🎓 15% OFF', desc: 'Verified Student Pass', discountPct: 15 },
    { code: 'FREESHIP', label: 'FREE Delivery', desc: 'Zero Delivery Fee', freeShipping: true },
  ]

  const handleApplyCode = (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase()
    if (!code) return

    const match = availableCoupons.find((c) => c.code === code)
    if (match) {
      soundFx.playWinSound()
      onApplyDiscount(match)
      toast(`🎉 Coupon "${match.code}" applied successfully!`, 'success')
      setCouponInput('')
    } else {
      soundFx.playHapticClick()
      toast(`❌ Invalid coupon code "${code}". Try WELCOME20 or STUDENT15.`, 'error')
    }
  }

  const toggleStudentOffer = () => {
    if (isStudentVerified || appliedCoupon?.code === 'STUDENT15') {
      setIsStudentVerified(false)
      onRemoveCoupon()
      toast('Student Offer removed.', 'info')
    } else {
      setIsStudentVerified(true)
      handleApplyCode('STUDENT15')
    }
  }

  return (
    <div className="glass-card p-5 rounded-2xl border border-indigo-500/20 space-y-4 font-Outfit">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎟️</span>
          <div>
            <h4 className="text-sm font-extrabold text-white">Promo Coupons & Student Offers</h4>
            <p className="text-[10px] text-gray-400">Save extra on your HYPERKART order</p>
          </div>
        </div>
        {appliedCoupon && (
          <button
            onClick={() => {
              setIsStudentVerified(false)
              onRemoveCoupon()
              toast('Coupon removed.', 'info')
            }}
            className="text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded-lg font-bold hover:bg-red-500/30 cursor-pointer"
          >
            Remove ({appliedCoupon.code})
          </button>
        )}
      </div>

      {/* 🎓 1-TAP STUDENT OFFER BANNER */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-pulse">🎓</span>
          <div>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1">
              Student Discount Offer
              <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded-full font-mono">15% OFF</span>
            </span>
            <p className="text-[11px] text-gray-300">Verified College / University Student Pass</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleStudentOffer}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg flex items-center gap-1 border ${
            isStudentVerified || appliedCoupon?.code === 'STUDENT15'
              ? 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500'
              : 'bg-indigo-600/80 border-indigo-400 text-white hover:bg-indigo-500'
          }`}
        >
          {isStudentVerified || appliedCoupon?.code === 'STUDENT15' ? '✓ Applied (15% OFF)' : '🎓 Activate Student Pass'}
        </button>
      </div>

      {/* PRESET COUPON CHIPS */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Available Promo Codes:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {availableCoupons.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleApplyCode(c.code)}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer hover:scale-102 ${
                appliedCoupon?.code === c.code
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-md'
                  : 'bg-slate-950/60 border-white/10 text-gray-300 hover:border-indigo-500/40 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-black">
                <span>{c.code}</span>
                <span className="text-[9px] text-amber-400 font-mono">{c.label}</span>
              </div>
              <p className="text-[9px] text-gray-400 truncate mt-0.5">{c.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* MANUAL COUPON INPUT FORM */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleApplyCode()
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Enter promo code (e.g. WELCOME20)"
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value)}
          className="flex-1 bg-slate-950/70 border border-white/15 text-white text-xs rounded-xl px-3.5 py-2.5 uppercase font-mono focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Apply
        </button>
      </form>
    </div>
  )
}
