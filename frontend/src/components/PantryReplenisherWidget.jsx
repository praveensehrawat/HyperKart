/**
 * AI Zero-Touch Pantry Auto-Replenisher Widget Component
 * ========================================================
 * Predicts household consumption velocity of daily staples (Milk, Bread, Eggs)
 * and enables 1-Tap Zero-Touch auto-reordering before running out.
 */

import { useEffect, useState } from 'react'
import { useToast } from './Toast'
import api from '../api/axios'

export default function PantryReplenisherWidget() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [reorderingId, setReorderingId] = useState(null)
  
  const toast = useToast()

  const loadPantry = async () => {
    try {
      const { data } = await api.get('/pantry')
      setItems(data || [])
    } catch (err) {
      console.error('Failed loading pantry items:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPantry()
  }, [])

  const handleQuickReorder = async (item) => {
    setReorderingId(item.id)
    try {
      const { data } = await api.post(`/pantry/reorder/${item.id}`)
      toast(`⚡ 1-Tap Auto-Reordered "${item.productName}"! Order ID: ${data.id?.slice(0, 8)}`, 'success')
      loadPantry()
    } catch (err) {
      toast('Failed to reorder pantry item', 'error')
    } finally {
      setReorderingId(null)
    }
  }

  const handleToggleAuto = async (id) => {
    try {
      const { data } = await api.post(`/pantry/toggle-auto/${id}`)
      toast(
        data.autoReplenishEnabled
          ? `🤖 Auto-Replenish Enabled for "${data.productName}"!`
          : `⏸ Auto-Replenish Paused for "${data.productName}"`,
        'info'
      )
      loadPantry()
    } catch (err) {
      toast('Failed toggling auto-replenish', 'error')
    }
  }

  if (loading) return null

  return (
    <div className="glass-card bg-gradient-to-br from-slate-900/90 via-cyan-950/20 to-slate-950/90 border border-cyan-500/30 p-6 rounded-3xl shadow-2xl space-y-5 font-Outfit my-6">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            📦
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-gradient">AI Zero-Touch Pantry Replenisher</h3>
            <p className="text-[11px] text-cyan-300 font-bold uppercase tracking-wide">
              Household Consumption Velocity Predictor
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-full font-mono font-extrabold">
          PREDICTIVE AI ACTIVE
        </span>
      </div>

      {/* Pantry Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const isDepleted = item.depletionPercentage >= 80

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                isDepleted
                  ? 'bg-rose-500/10 border-rose-500/40 shadow-rose-500/10'
                  : 'bg-slate-950/60 border-white/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-gray-400">
                    Cycle: Every {item.consumptionCycleDays} Days
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isDepleted
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    {isDepleted ? '🔴 REORDER TODAY' : '🟢 STOCKED'}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-gray-100 line-clamp-2">
                  {item.productName}
                </h4>
                <p className="text-xs font-mono font-bold text-cyan-400 mt-1">
                  ${item.unitPrice?.toFixed(2)}
                </p>

                {/* Dynamic Depletion Velocity Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-gray-400">Depletion Level</span>
                    <span className={isDepleted ? 'text-rose-400 font-black' : 'text-cyan-300'}>
                      {item.depletionPercentage}% Empty
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDepleted ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${item.depletionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAuto(item.id)}
                  className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    item.autoReplenishEnabled
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900 border-white/10 text-gray-500'
                  }`}
                  title="Toggle Zero-Touch Auto-Reorder Rule"
                >
                  {item.autoReplenishEnabled ? '🤖 Auto: ON' : '⏸ Auto: OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickReorder(item)}
                  disabled={reorderingId === item.id}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md flex items-center gap-1 hover:scale-103 ${
                    isDepleted
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {reorderingId === item.id ? 'Ordering...' : '⚡ 1-Tap Reorder'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
