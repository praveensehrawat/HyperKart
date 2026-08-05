/**
 * AI Recipe-to-Cart 1-Click Bundler Widget Component
 * ===================================================
 * Asks the buyer "What should I cook tonight?", parses the recipe ingredients via AI,
 * matches local Kirana store items, and adds the whole bundle to the cart with 1 click!
 */

import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { addItem } from '../store/cartSlice'
import { useToast } from './Toast'
import api from '../api/axios'

export default function RecipeBundleWidget() {
  const [prompt, setPrompt] = useState('Shahi Paneer for 4 people')
  const [servings, setServings] = useState(4)
  const [loading, setLoading] = useState(false)
  const [bundle, setBundle] = useState(null)

  const dispatch = useDispatch()
  const toast = useToast()

  const handleFetchBundle = async (e, customPrompt) => {
    if (e) e.preventDefault()
    const queryToUse = customPrompt || prompt
    if (!queryToUse.trim()) return

    setLoading(true)
    setBundle(null)

    try {
      const { data } = await api.post('/ai/recipe-bundle', {
        prompt: queryToUse,
        servings: parseInt(servings),
      })

      // Artificial delay for smooth AI Chef feedback
      setTimeout(() => {
        setBundle(data)
        setLoading(false)
      }, 600)
    } catch (err) {
      console.error('Recipe bundle error:', err)
      toast('AI Recipe service unavailable', 'error')
      setLoading(false)
    }
  }

  const handleAddBundleToCart = () => {
    if (!bundle || !bundle.items || bundle.items.length === 0) return

    bundle.items.forEach((item) => {
      dispatch(
        addItem({
          product: {
            id: item.id,
            name: item.name,
            price: item.unitPrice,
            category: item.category,
            image: item.imageUrl,
            sellerId: item.sellerId || 'seller-chawla',
            sellerName: item.sellerName || 'Local Kirana Store',
            isRecipeBundle: true,
            recipeName: bundle.dishName,
          },
          sellerId: item.sellerId || 'seller-chawla',
          quantity: item.quantity || 1,
        })
      )
    })

    toast(
      `🍳 Added all ${bundle.items.length} ingredients for "${bundle.dishName}" to your cart!`,
      'success'
    )
  }

  return (
    <div className="glass-card bg-gradient-to-br from-slate-900/90 via-amber-950/20 to-slate-950/90 border border-amber-500/30 p-6 rounded-3xl shadow-2xl space-y-5 font-Outfit my-6">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
            🍳
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-gradient">AI Recipe 1-Click Bundler</h3>
            <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wide">
              "What Should I Cook Tonight?"
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full font-mono font-extrabold">
          5% BUNDLE DISCOUNT
        </span>
      </div>

      {/* Recipe Presets */}
      <div>
        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
          Popular Recipe Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { name: '🥘 Shahi Paneer for 4', query: 'Shahi Paneer for 4 people' },
            { name: '☕ Cold Coffee & Sandwiches', query: 'Cold Coffee and Sandwiches for 2' },
            { name: '☕ Masala Chai & Biscuits', query: 'Desi Masala Chai and Biscuits' },
            { name: '🥗 Fresh Green Salad', query: 'Fresh Green Salad and Fruits' },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(preset.query)
                handleFetchBundle(null, preset.query)
              }}
              className="bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer hover:scale-103"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Dish Form */}
      <form onSubmit={handleFetchBundle} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
              Tell AI Chef what you want to cook:
            </label>
            <input
              type="text"
              placeholder="e.g. I want to make Paneer Butter Masala tonight"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/15 text-white font-bold rounded-xl px-4 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
              Servings
            </label>
            <select
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-full bg-slate-950/80 border border-white/15 text-white font-bold rounded-xl px-3 py-2.5 text-xs focus:border-amber-500 focus:outline-none"
            >
              <option value={2}>2 People</option>
              <option value={4}>4 People</option>
              <option value={6}>6 People</option>
              <option value={8}>8 People</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>AI Chef Parsing Recipe Ingredients from Local Kiranas...</span>
            </>
          ) : (
            <>
              <span>🍳 Parse Ingredients & Find Nearest Local Store Stock</span>
            </>
          )}
        </button>
      </form>

      {/* Parsed Ingredient Bundle Results */}
      {bundle && (
        <div className="space-y-4 pt-4 border-t border-white/10 animate-toast-in">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-gray-100 flex items-center gap-2">
              <span>📋 Ingredient Bundle for "{bundle.dishName}"</span>
              <span className="text-xs text-gray-400 font-normal">({bundle.servings} Servings)</span>
            </h4>

            <div className="text-right">
              <span className="text-lg font-black text-amber-400 font-mono">
                ${bundle.finalTotal?.toFixed(2)}
              </span>
              {bundle.recipeDiscount > 0 && (
                <span className="block text-[10px] font-mono text-emerald-400 font-bold">
                  Saved ${bundle.recipeDiscount?.toFixed(2)} (5% Bundle OFF)
                </span>
              )}
            </div>
          </div>

          {/* Ingredient Items Table */}
          <div className="space-y-2">
            {bundle.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="font-extrabold text-gray-200">{item.name}</h5>
                    <p className="text-[10px] text-gray-400">Category: {item.category}</p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-gray-200">${item.unitPrice?.toFixed(2)}</span>
                  <span className="text-[10px] text-indigo-300 block">x{item.quantity} unit</span>
                </div>
              </div>
            ))}
          </div>

          {/* 1-Click Add to Cart Action */}
          <button
            onClick={handleAddBundleToCart}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
          >
            <span>🛒 Add All {bundle.items?.length} Ingredients to Cart (1-Click)</span>
          </button>
        </div>
      )}
    </div>
  )
}
