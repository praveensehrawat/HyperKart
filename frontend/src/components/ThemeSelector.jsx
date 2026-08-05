/**
 * Theme Selector Component (System / Dark / Light)
 * ================================================
 * Compact, single toggle dropdown for application appearance modes.
 */

import { useState, useEffect } from 'react'

export default function ThemeSelector() {
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'system')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')

    let effectiveTheme = selectedTheme
    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      effectiveTheme = prefersDark ? 'dark' : 'light'
    }

    if (effectiveTheme === 'light') {
      root.classList.add('theme-light')
    } else {
      root.classList.add('theme-dark')
    }
  }

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('app-theme', theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const themeOptions = [
    { id: 'system', label: 'System', icon: '💻' },
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
  ]

  const activeOption = themeOptions.find((o) => o.id === theme) || themeOptions[0]

  return (
    <div className="relative font-Outfit">
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-gray-200 hover:text-white shadow-sm"
        title="Change Appearance Theme"
        aria-label="Change Appearance Theme"
      >
        <span className="text-xs">{activeOption.icon}</span>
        <span className="text-[11px] font-extrabold">{activeOption.label}</span>
        <span className="text-[8px] opacity-70 ml-0.5">▼</span>
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-32 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl z-50 py-1 font-Outfit backdrop-blur-md animate-toast-in">
            <div className="px-2.5 py-1 text-[9px] uppercase font-black text-indigo-300 tracking-wider border-b border-white/10">
              Theme
            </div>
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id)
                  setDropdownOpen(false)
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  theme === opt.id
                    ? 'bg-indigo-600/30 text-indigo-300 font-black'
                    : 'text-gray-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">{opt.icon}</span>
                  <span className="text-xs">{opt.label}</span>
                </span>
                {theme === opt.id && <span className="text-emerald-400 text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
