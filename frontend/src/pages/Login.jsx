/**
 * Customer, Merchant & Delivery Login Page
 * ========================================
 * Renders user credentials login form with Password & Email Saver (Remember Me)
 * and handles password reset workflows for all account roles (Buyer, Seller, Delivery Driver, Admin).
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axios'
import { setAuth } from '../store/authSlice'
import { formatError } from '../utils/formatError'

export default function Login() {
  const { user } = useSelector((s) => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === 'true')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotStep, setForgotStep] = useState(1) // 1: Email verify, 2: Reset password
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotErr, setForgotErr] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Helper to determine home dashboard route by user role
  const getDashboardPath = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return '/admin'
      case 'SELLER':
        return '/seller-dashboard'
      case 'DRIVER':
        return '/driver-dashboard'
      default:
        return '/products'
    }
  }

  // Auto-redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate(getDashboardPath(user.role), { replace: true })
    }
  }, [user, navigate])

  // Restore saved credentials if Remember Me was enabled
  useEffect(() => {
    const savedRemember = localStorage.getItem('rememberMe') === 'true'
    if (savedRemember) {
      const savedEmail = localStorage.getItem('rememberedEmail') || ''
      const savedPass = localStorage.getItem('rememberedPassword') || ''
      setEmail(savedEmail)
      setPassword(savedPass)
      setRememberMe(true)
    }
  }, [])

  /**
   * Processes the form submission request and logs the user into their session.
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      
      // Save or clear remembered credentials
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
        localStorage.setItem('rememberedPassword', password)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberedPassword')
        localStorage.removeItem('rememberMe')
      }

      dispatch(setAuth(data))
      const target = getDashboardPath(data.user?.role)
      navigate(target, { replace: true })
    } catch (err) {
      setError(formatError(err, 'Login failed. Please check credentials.'))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles Step 1: Verify registered email address for password reset
   */
  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotErr('')
    setForgotMsg('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotMsg(data.message || 'Email verified! Please enter your new password below.')
      setForgotStep(2)
    } catch (err) {
      setForgotErr(formatError(err, 'No registered account found with this email.'))
    } finally {
      setForgotLoading(false)
    }
  }

  /**
   * Handles Step 2: Submit new password reset request
   */
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotErr('')
    setForgotMsg('')
    try {
      const { data } = await api.post('/auth/reset-password', { email: forgotEmail, newPassword })
      setForgotMsg(data.message || 'Password successfully updated!')
      setTimeout(() => {
        setEmail(forgotEmail)
        setPassword(newPassword)
        setShowForgotModal(false)
        setForgotStep(1)
        setForgotEmail('')
        setNewPassword('')
        setForgotMsg('')
      }, 1800)
    } catch (err) {
      setForgotErr(formatError(err, 'Failed to reset password.'))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto glass-card p-8 rounded-2xl mt-12 relative overflow-hidden font-Outfit">
      <div className="mb-6">
        <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          🔑 Authentication
        </span>
        <h2 className="text-3xl font-extrabold text-gradient">Login</h2>
      </div>

      {error && <p className="text-red-300 mb-4 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-semibold animate-pulse">{formatError(error)}</p>}

      <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4 font-Outfit">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Email Address</label>
          <input 
            type="email" 
            placeholder="email@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value.trim())}
            autoComplete="username"
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
            required 
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Password</label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email)
                setForgotStep(1)
                setForgotErr('')
                setForgotMsg('')
                setShowForgotModal(true)
              }}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono" 
            required 
          />
        </div>

        {/* 💾 Password & ID Saver Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-300 hover:text-white transition-colors select-none">
            <input 
              type="checkbox" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-white/20 bg-slate-950 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer" 
            />
            <span>💾 Remember Me (Save ID & Password)</span>
          </label>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full btn-neon text-white py-3 rounded-xl font-bold transition-all text-sm mt-6 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Logging in...
            </>
          ) : 'Login'}
        </button>
      </form>
      
      <p className="mt-6 text-xs text-gray-500 text-center font-Outfit">
        Don't have an account? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold">Register</Link>
      </p>

      {/* 🔐 FORGOT PASSWORD MODAL (For Buyers, Sellers, Delivery Drivers & Admins) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-Outfit animate-toast-in">
          <div className="relative w-full max-w-md glass-card bg-slate-900/95 border border-indigo-500/30 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Reset Account Password</h3>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase">Buyer • Seller • Delivery • Admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-white font-mono font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {forgotErr && <p className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 p-2.5 rounded-xl font-semibold">{forgotErr}</p>}
            {forgotMsg && <p className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-2.5 rounded-xl font-semibold">{forgotMsg}</p>}

            {forgotStep === 1 ? (
              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <p className="text-xs text-gray-300">
                  Enter your registered account email address below. Works for Buyers, Sellers, Delivery Drivers, and Administrators.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Account Email</label>
                  <input
                    type="email"
                    placeholder="your-email@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value.trim())}
                    className="w-full bg-slate-950/70 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {forgotLoading ? 'Verifying Account...' : 'Verify Email & Continue'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-gray-300">
                  Account verified for <strong className="text-indigo-300">{forgotEmail}</strong>. Enter your new password below:
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950/70 border border-white/15 text-white rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    minLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {forgotLoading ? 'Updating Password...' : 'Reset Password Now'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
