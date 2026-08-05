import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axios'
import { setAuth } from '../store/authSlice'
import SocialAuthButtons from '../components/SocialAuthButtons'

export default function Register() {
  const { user } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'BUYER' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // CAPTCHA Challenge State
  const createRandomCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const [captchaCode, setCaptchaCode] = useState(createRandomCaptcha)
  const [userCaptcha, setUserCaptcha] = useState('')

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

  // Generate random 5-character alphanumeric CAPTCHA challenge
  const generateCaptcha = () => {
    setCaptchaCode(createRandomCaptcha())
    setUserCaptcha('')
  }

  // Helper validation logic for strong passwords
  const passwordCriteria = {
    hasMinLength: form.password.length >= 8,
    hasUpper: /[A-Z]/.test(form.password),
    hasLower: /[a-z]/.test(form.password),
    hasNumber: /[0-9]/.test(form.password),
    hasSymbol: /[^A-Za-z0-9]/.test(form.password)
  }

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean)

  /**
   * Processes form submissions to register new user profiles.
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setError('Please fulfill all password strength requirements before continuing.')
      return
    }

    if (userCaptcha.trim().toUpperCase() !== captchaCode) {
      setError('Invalid CAPTCHA security code! Please enter the exact code shown.')
      generateCaptcha()
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', form)
      // Save session credentials
      dispatch(setAuth(data))
      const target = getDashboardPath(data.user?.role)
      navigate(target, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try using a different email address.')
      generateCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto glass-card p-8 rounded-2xl mt-8 relative overflow-hidden font-Outfit">
      <div className="mb-6">
        <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          📝 Signup
        </span>
        <h2 className="text-3xl font-extrabold text-gradient">Create Account</h2>
      </div>

      {error && (
        <p className="text-red-300 mb-4 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl font-semibold animate-pulse">
          {error}
        </p>
      )}

      {/* Social Authentication (Google & Facebook) */}
      <SocialAuthButtons selectedRole={form.role} mode="register" />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Full Name</label>
          <input 
            placeholder="John Doe" 
            value={form.name} 
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
            required 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Email Address</label>
          <input 
            type="email" 
            placeholder="john.doe@example.com" 
            value={form.email} 
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm" 
            required 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Password</label>
          <input 
            type="password" 
            placeholder="Choose a strong password" 
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm font-mono" 
            required 
          />
          
          {/* Password Strength Requirements Accordion Dropdown */}
          <details className="mt-2 text-[11px] text-gray-400 group">
            <summary className="cursor-pointer font-bold hover:text-indigo-300 transition-colors flex items-center gap-1.5 select-none py-1">
              <span>🔒 Password Requirements</span>
              <span className="text-[10px] text-gray-500 group-open:rotate-180 transition-transform">▼</span>
              {isPasswordValid ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold ml-auto border border-emerald-500/20">✓ Strong</span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold ml-auto border border-amber-500/20">Requirements ▾</span>
              )}
            </summary>
            <div className="mt-2 bg-slate-950/60 border border-white/10 p-3.5 rounded-xl space-y-1.5">
              <p className="font-bold text-gray-400 uppercase tracking-wide mb-1 text-[10px]">Strength Criteria:</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${passwordCriteria.hasMinLength ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={passwordCriteria.hasMinLength ? 'text-emerald-300 font-bold' : 'text-gray-400'}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={(passwordCriteria.hasUpper && passwordCriteria.hasLower) ? 'text-emerald-300 font-bold' : 'text-gray-400'}>Upper and lowercase letters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${passwordCriteria.hasNumber ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={passwordCriteria.hasNumber ? 'text-emerald-300 font-bold' : 'text-gray-400'}>At least one number (0-9)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${passwordCriteria.hasSymbol ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={passwordCriteria.hasSymbol ? 'text-emerald-300 font-bold' : 'text-gray-400'}>At least one special symbol (@, #, $, etc.)</span>
              </div>
            </div>
          </details>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Account Role</label>
          <select 
            value={form.role} 
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm select-dark"
          >
            <option value="BUYER">Buyer (Shop from local stores)</option>
            <option value="SELLER">Seller (Manage shop and inventory)</option>
            <option value="DRIVER">Driver (Deliver HYPERKART orders)</option>
          </select>
        </div>

        {/* Security CAPTCHA Challenge */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
            🛡️ Security Captcha Verification
          </label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-950 border border-indigo-500/30 py-2.5 px-4 rounded-xl text-center font-mono font-black text-xl tracking-[0.4em] text-indigo-300 select-none shadow-inner bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 relative overflow-hidden">
              <span className="line-through decoration-pink-500/60 decoration-2">{captchaCode}</span>
            </div>
            <button
              type="button"
              onClick={generateCaptcha}
              className="px-3.5 py-2.5 bg-slate-900 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-slate-800 flex items-center gap-1.5 shadow"
              title="Generate new CAPTCHA challenge code"
            >
              <span>🔄</span> Refresh
            </button>
          </div>
          <input
            type="text"
            placeholder="Enter captcha code above"
            value={userCaptcha}
            onChange={(e) => setUserCaptcha(e.target.value.toUpperCase())}
            className="w-full bg-slate-950/60 border border-white/15 text-white rounded-xl px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs font-mono uppercase tracking-widest mt-1"
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !isPasswordValid || !userCaptcha}
          className="w-full btn-neon text-white py-3 rounded-xl font-bold transition-all text-sm mt-6 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Creating Account...
            </>
          ) : 'Register'}
        </button>
      </form>
      
      <p className="mt-6 text-xs text-gray-500 text-center font-Outfit">
        Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline font-bold">Login</Link>
      </p>
    </div>
  )
}
