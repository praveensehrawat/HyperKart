/**
 * Premium Interactive Toast Notification Component
 * ===============================================
 * Exposes a context provider to render alert cards with high contrast slide-in animations,
 * custom countdown progress bars, and manual dismiss buttons.
 */

import React, { createContext, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  /**
   * Adds a new toast message to the queue.
   */
  const addToast = (message, type = 'info', timeout = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type, timeout }])
    
    // Automatically remove toast after timeout
    setTimeout(() => {
      removeToast(id)
    }, timeout)
  }

  const removeToast = (id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast floating container */}
      <div className="fixed top-16 right-4 flex flex-col gap-3 z-[9999] pointer-events-none font-Outfit">
        {toasts.map((t) => {
          const typeClasses = 
            t.type === 'success' ? 'bg-slate-900 border-emerald-500/60 text-white border-l-4 border-l-emerald-400 font-bold' :
            t.type === 'error' ? 'bg-slate-900 border-rose-500/60 text-white border-l-4 border-l-rose-400 font-bold' :
            'bg-slate-900 border-indigo-500/60 text-white border-l-4 border-l-indigo-400 font-bold'

          const icon = 
            t.type === 'success' ? '✨' :
            t.type === 'error' ? '❌' :
            '🔔'

          return (
            <div
              key={t.id}
              className={`toast-card relative overflow-hidden w-80 border rounded-xl p-4 shadow-2xl transition-all duration-300 pointer-events-auto animate-toast-in flex items-start gap-3 ${typeClasses}`}
            >
              {/* Icon */}
              <span className="text-base select-none">{icon}</span>

              {/* Message content */}
              <div className="flex-1 text-xs font-bold leading-relaxed pr-4 text-white">
                {t.message}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="absolute top-2 right-2 text-white/70 hover:text-white transition-opacity font-bold text-sm cursor-pointer select-none"
              >
                ×
              </button>

              {/* Shading progress bar */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-indigo-400 opacity-60 animate-toast-progress" 
                style={{ animationDuration: `${t.timeout}ms` }}
              />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
