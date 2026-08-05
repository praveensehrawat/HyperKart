/**
 * Neighborhood Group-Buying Community Deals Widget Component
 * ============================================================
 * Displays live community pools in the neighborhood. Joining a pool unlocks
 * FREE Delivery + 10% Community Bulk Discount for all neighbors!
 */

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useToast } from './Toast'
import { addMessageListener } from '../lib/socket'
import api from '../api/axios'

export default function GroupBuyingWidget({ onSelectPool, currentShopId }) {
  const [pools, setPools] = useState([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNeighborhood, setNewNeighborhood] = useState('')
  
  const { user } = useSelector((s) => s.auth)
  const toast = useToast()

  const loadPools = async () => {
    try {
      const { data } = await api.get('/grouppools')
      setPools(data || [])
    } catch (err) {
      console.error('Failed to load group pools:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPools()
  }, [])

  // Listen for live WebSocket updates when neighbors join or create pools
  useEffect(() => {
    const unsub = addMessageListener((msg) => {
      if (msg?.type === 'group_pool_update') {
        loadPools()
        if (msg.eventType === 'JOIN_POOL' && msg.unlocked) {
          toast(`🎉 Community Pool Unlocked in ${msg.neighborhoodName}! FREE Delivery + 10% OFF active!`, 'success')
        }
      }
    })
    return () => unsub()
  }, [])

  const handleJoin = async (pool) => {
    setJoiningId(pool.id)
    try {
      const participantName = user?.name || 'Neighbor Buyer'
      const { data } = await api.post(`/grouppools/${pool.id}/join`, { participantName })
      toast(`👥 Joined Community Pool in ${pool.neighborhoodName}! 10% Group Discount & Free Delivery Unlocked!`, 'success')
      if (onSelectPool) onSelectPool(data)
      loadPools()
    } catch (err) {
      toast('Failed to join group pool', 'error')
    } finally {
      setJoiningId(null)
    }
  }

  const handleCreatePool = async (e) => {
    e.preventDefault()
    if (!newNeighborhood.trim()) return
    try {
      const { data } = await api.post('/grouppools/create', {
        neighborhoodName: newNeighborhood.trim(),
        creatorName: user?.name || 'Neighbor Resident',
        creatorId: user?.id || 'gen-user-1',
        shopName: 'Chawla Kiryana Store',
        sellerId: currentShopId || 'seller-chawla',
      })
      toast(`🎉 Community Group Pool created for "${data.neighborhoodName}"! Invite neighbors to save 10%!`, 'success')
      setShowCreateModal(false)
      setNewNeighborhood('')
      if (onSelectPool) onSelectPool(data)
      loadPools()
    } catch (err) {
      toast('Failed to create community pool', 'error')
    }
  }

  if (loading) return null

  return (
    <div className="space-y-4 my-6 font-Outfit">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/80 p-4 rounded-2xl border border-purple-500/30 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
            👥
          </div>
          <div>
            <h3 className="font-extrabold text-base text-gray-100 flex items-center gap-2">
              <span>Neighborhood Group-Buying Pools</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                SAVE 10% + FREE DELIVERY
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Join a 30-min neighborhood pool. When 2+ neighbors join, everyone unlocks <strong>10% OFF + FREE Delivery</strong> in 1 single driver trip!
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md self-start sm:self-auto flex items-center gap-1.5 hover:scale-103"
        >
          <span>✨ Start Pool in My Building</span>
        </button>
      </div>

      {/* Active Neighborhood Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pools.length === 0 && (
          <div className="md:col-span-2 glass-card p-6 text-center text-xs text-gray-400 space-y-2">
            <p>No active neighborhood pools right now.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-400 hover:underline font-bold"
            >
              Click here to start the first Community Pool in your apartment complex!
            </button>
          </div>
        )}

        {pools.map((p) => {
          const isUnlocked = p.freeDeliveryUnlocked || p.participantsCount >= p.targetParticipants

          return (
            <div
              key={p.id}
              className={`glass-card p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                isUnlocked
                  ? 'border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/10'
                  : 'border-purple-500/30 bg-purple-500/5 shadow-purple-500/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-extrabold text-sm text-gray-100 flex items-center gap-1.5">
                    <span>🏢</span> {p.neighborhoodName}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isUnlocked
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                    }`}
                  >
                    {isUnlocked ? '🟢 10% OFF UNLOCKED' : '⏳ 1 MORE NEEDED'}
                  </span>
                </div>

                <div className="text-xs text-gray-400 space-y-1">
                  <p>
                    Started by: <strong className="text-gray-200">{p.creatorName}</strong> ({p.shopName})
                  </p>
                  <p className="flex items-center gap-1 text-[11px]">
                    <span>Joined:</span>
                    <strong className="text-indigo-300 font-mono">
                      {p.participantNames?.join(', ') || p.creatorName}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                  <span className="text-gray-400">Pool Progress:</span>
                  <span className="text-emerald-400">{p.participantsCount}/{p.targetParticipants} Neighbors</span>
                </div>

                <button
                  onClick={() => handleJoin(p)}
                  disabled={joiningId === p.id}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 hover:scale-103 ${
                    isUnlocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      : 'btn-neon text-white shadow-md'
                  }`}
                >
                  {joiningId === p.id ? 'Joining...' : isUnlocked ? '✔ Join Deal (10% OFF)' : '🤝 Join Neighbor Pool'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal to Create New Neighborhood Pool */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-Outfit animate-toast-in">
          <div className="relative w-full max-w-md glass-card bg-slate-900/95 border border-indigo-500/30 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>✨ Start Community Group Deal</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                  Apartment Complex / Society Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Palms Apartment, Block B"
                  value={newNeighborhood}
                  onChange={(e) => setNewNeighborhood(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:outline-none text-xs font-bold"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <p className="font-bold">👥 How Neighborhood Group Buying Works:</p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 opacity-90">
                  <li>Your group deal will be live for 30 minutes.</li>
                  <li>When 1 neighbor joins, everyone gets <strong>10% OFF + FREE Delivery</strong>.</li>
                  <li>Delivery driver drops all packages in 1 single trip.</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full btn-neon text-white py-3 rounded-xl font-extrabold text-xs cursor-pointer shadow-lg"
              >
                🚀 Create & Invite Neighbors
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
