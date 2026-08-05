/**
 * Gamified Scratch & Win Cashback Rewards Modal Component
 * ========================================================
 * Interactive HTML5 Canvas foil scratch card. Drag cursor/finger to scratch away
 * gold/silver foil to reveal wallet cashbacks, karma credits, and free delivery passes!
 */

import { useEffect, useRef, useState } from 'react'
import { soundFx } from '../lib/soundFx'
import { useToast } from './Toast'

export default function ScratchRewardModal({ onClose, sourceTrigger }) {
  const canvasRef = useRef(null)
  const [isScratched, setIsScratched] = useState(false)
  const [scratchProgress, setScratchProgress] = useState(0)
  const [reward, setReward] = useState(null)
  const isDrawing = useRef(false)
  const toast = useToast()

  const rewardsList = [
    { title: '$5.00 Wallet Cashback', icon: '🪙', type: 'CASHBACK', desc: 'Credited instantly to your HYPERKART Wallet!' },
    { title: '250 Karma Green Credits', icon: '🌿', type: 'KARMA', desc: 'Neighborhood Sustainability Badge Unlocked!' },
    { title: 'FREE Delivery Pass (3 Orders)', icon: '🚚', type: 'DELIVERY', desc: 'Enjoy 100% Free Shipping on your next 3 orders!' },
    { title: '15% OFF AI Bargain Pass', icon: '🏷️', type: 'COUPON', desc: 'Extra 15% discount bonus on your next AI Bargain!' },
  ]

  // Pick a random reward on mount
  useEffect(() => {
    const selected = rewardsList[Math.floor(Math.random() * rewardsList.length)]
    setReward(selected)
  }, [])

  // Initialize Canvas Gold Foil Overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 300
    canvas.height = 180

    // Draw Gold Holographic Gradient Foil
    const grad = ctx.createLinearGradient(0, 0, 300, 180)
    grad.addColorStop(0, '#f59e0b')
    grad.addColorStop(0.3, '#d97706')
    grad.addColorStop(0.7, '#fbbf24')
    grad.addColorStop(1, '#b45309')

    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 300, 180)

    // Foil pattern text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.font = 'bold 16px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✨ SCRATCH HERE WITH CURSOR ✨', 150, 95)
    ctx.fillText('🎁 REVEAL YOUR REWARD 🎁', 150, 120)
  }, [])

  // Scratch Drawing Logic
  const scratch = (x, y) => {
    const canvas = canvasRef.current
    if (!canvas || isScratched) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = x - rect.left
    const mouseY = y - rect.top

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(mouseX, mouseY, 22, 0, Math.PI * 2)
    ctx.fill()

    soundFx.playScratchSound()
    checkProgress(ctx, canvas)
  }

  const checkProgress = (ctx, canvas) => {
    if (isScratched) return
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let clearedPixels = 0
      for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] === 0) clearedPixels++
      }
      const pct = Math.round((clearedPixels / (canvas.width * canvas.height)) * 100)
      setScratchProgress(pct)

      // Auto reveal at > 35% scratched
      if (pct > 35 && !isScratched) {
        setIsScratched(true)
        soundFx.playWinSound()
        toast(`🎉 Congratulations! You won "${reward?.title}"!`, 'success')
      }
    } catch (e) {}
  }

  const handleMouseDown = (e) => {
    isDrawing.current = true
    scratch(e.clientX, e.clientY)
  }
  const handleMouseMove = (e) => {
    if (isDrawing.current) scratch(e.clientX, e.clientY)
  }
  const handleMouseUp = () => {
    isDrawing.current = false
  }

  const handleTouchStart = (e) => {
    isDrawing.current = true
    if (e.touches && e.touches[0]) scratch(e.touches[0].clientX, e.touches[0].clientY)
  }
  const handleTouchMove = (e) => {
    if (isDrawing.current && e.touches && e.touches[0]) {
      scratch(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleClaim = () => {
    soundFx.playCashRegisterSound()
    toast(`💰 Claimed "${reward?.title}" to your HYPERKART Account!`, 'success')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-Outfit animate-toast-in">
      <div className="relative w-full max-w-md glass-card bg-slate-900/95 border border-amber-500/40 p-6 rounded-3xl shadow-2xl space-y-5 text-center overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🎁</span>
            <div className="text-left">
              <h3 className="text-base font-extrabold text-gradient">Scratch & Win Reward</h3>
              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                {sourceTrigger || 'Action Reward Unlocked'}
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

        {/* Scratch Card Container */}
        <div className="relative w-[300px] h-[180px] mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/50 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 space-y-2 select-none">
          {/* Underneath Reward Card */}
          <div className="text-3xl animate-pulse">{reward?.icon}</div>
          <h4 className="text-base font-black text-amber-400">{reward?.title}</h4>
          <p className="text-[11px] text-gray-300 px-3 opacity-90">{reward?.desc}</p>
          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
            UNLOCKED & VERIFIED
          </span>

          {/* Foil Scratch Layer Overlay */}
          {!isScratched && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="absolute inset-0 cursor-crosshair rounded-2xl touch-none"
            />
          )}
        </div>

        <p className="text-xs text-gray-400 font-bold">
          {isScratched
            ? '🎉 Card scratched! Claim your reward below.'
            : 'Swipe cursor or finger over the card to scratch off the foil!'}
        </p>

        {/* Claim Button */}
        {isScratched ? (
          <button
            onClick={handleClaim}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 rounded-2xl font-extrabold text-xs transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 hover:scale-103"
          >
            <span>💰 Claim & Add to HYPERKART Wallet</span>
          </button>
        ) : (
          <button
            onClick={() => setIsScratched(true)}
            className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
          >
            Or tap here to Auto-Reveal Foil
          </button>
        )}
      </div>
    </div>
  )
}
