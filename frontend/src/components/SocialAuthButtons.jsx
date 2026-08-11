import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import api from '../api/axios'
import { setAuth } from '../store/authSlice'
import { formatError } from '../utils/formatError'

/**
 * Social Authentication Component (Google & Facebook)
 * ==================================================
 * Renders modern SSO buttons for Google and Facebook login/registration.
 * Handles role-based account registration and OAuth backend validation.
 */
export default function SocialAuthButtons({ selectedRole = 'BUYER', mode = 'login' }) {
  const [loadingProvider, setLoadingProvider] = useState(null)
  const [error, setError] = useState('')
  const [showDemoModal, setShowDemoModal] = useState(null) // 'GOOGLE' or 'FACEBOOK'
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [activeRole, setActiveRole] = useState(selectedRole)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const getDashboardPath = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return '/admin'
      case 'SELLER':
        return '/seller-dashboard'
      case 'CAPTAIN':
      case 'DRIVER':
        return '/driver-dashboard'
      default:
        return '/products'
    }
  }

  const handleSocialAuth = async (provider, socialData = {}) => {
    setLoadingProvider(provider)
    setError('')
    try {
      const payload = {
        provider: provider,
        providerId: socialData.id || `${provider.toLowerCase()}_${Date.now()}`,
        email: socialData.email || `${provider.toLowerCase()}_user@example.com`,
        name: socialData.name || (provider === 'GOOGLE' ? 'Google Account User' : 'Facebook User'),
        avatarUrl: socialData.picture || (provider === 'GOOGLE' 
          ? 'https://lh3.googleusercontent.com/a/default-user=s96-c' 
          : 'https://graph.facebook.com/v19.0/me/picture?type=normal'),
        role: activeRole || selectedRole,
        token: socialData.token || `token_${provider.toLowerCase()}_${Date.now()}`
      }

      const { data } = await api.post(`/auth/${provider.toLowerCase()}`, payload)
      dispatch(setAuth(data))
      const target = getDashboardPath(data.user?.role || data.role)
      navigate(target, { replace: true })
    } catch (err) {
      setError(formatError(err, `${provider} authentication failed. Please try again.`))
    } finally {
      setLoadingProvider(null)
      setShowDemoModal(null)
    }
  }

  const triggerGoogleLogin = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (googleClientId && window.google?.accounts?.id) {
      setLoadingProvider('GOOGLE')
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          // Decode JWT payload token from Google
          try {
            const base64Url = response.credential.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            }).join(''))
            const payload = JSON.parse(jsonPayload)

            handleSocialAuth('GOOGLE', {
              id: payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture,
              token: response.credential
            })
          } catch (e) {
            handleSocialAuth('GOOGLE', {})
          }
        }
      })
      window.google.accounts.id.prompt()
    } else {
      // Open interactive OAuth simulation prompt
      setCustomName('Google Account User')
      setCustomEmail(`google.user.${Math.floor(Math.random() * 900 + 100)}@gmail.com`)
      setShowDemoModal('GOOGLE')
    }
  }

  const triggerFacebookLogin = () => {
    const fbAppId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (fbAppId && window.FB) {
      setLoadingProvider('FACEBOOK')
      window.FB.login((response) => {
        if (response.authResponse) {
          window.FB.api('/me', { fields: 'name,email,picture' }, (userInfo) => {
            handleSocialAuth('FACEBOOK', {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture?.data?.url,
              token: response.authResponse.accessToken
            })
          })
        } else {
          setLoadingProvider(null)
        }
      }, { scope: 'public_profile,email' })
    } else {
      // Open interactive OAuth simulation prompt
      setCustomName('Facebook Account User')
      setCustomEmail(`fb.user.${Math.floor(Math.random() * 900 + 100)}@facebook.com`)
      setShowDemoModal('FACEBOOK')
    }
  }

  return (
    <div className="w-full space-y-3 font-Outfit my-4">
      {error && (
        <div className="text-red-300 text-xs bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl font-semibold animate-pulse">
          {formatError(error)}
        </div>
      )}

      {/* Provider SSO Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google SSO Button */}
        <button
          type="button"
          onClick={triggerGoogleLogin}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-2.5 w-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:shadow-indigo-500/10 disabled:opacity-50"
        >
          {loadingProvider === 'GOOGLE' ? (
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

        {/* Facebook SSO Button */}
        <button
          type="button"
          onClick={triggerFacebookLogin}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-2.5 w-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/40 hover:border-[#1877F2] text-white py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer hover:shadow-[#1877F2]/20 disabled:opacity-50"
        >
          {loadingProvider === 'FACEBOOK' ? (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>Continue with Facebook</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink mx-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          or sign in with email
        </span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      {/* Interactive Account Modal for Social Login Demo */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-toast-in font-Outfit">
          <div className="relative w-full max-w-sm glass-card bg-slate-900/95 border border-indigo-500/30 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                {showDemoModal === 'GOOGLE' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Sign in with {showDemoModal === 'GOOGLE' ? 'Google' : 'Facebook'}
                  </h3>
                  <p className="text-[10px] text-gray-400">HYPERKART Single Sign-On</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(null)}
                className="text-gray-400 hover:text-white font-mono font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/15 text-white rounded-xl px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/15 text-white rounded-xl px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Account Role</label>
                <select
                  value={activeRole}
                  onChange={(e) => setActiveRole(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/15 text-white rounded-xl px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none select-dark"
                >
                  <option value="BUYER">Buyer (Shop from local stores)</option>
                  <option value="SELLER">Seller (Manage shop and inventory)</option>
                  <option value="CAPTAIN">Captain (Deliver HYPERKART orders)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDemoModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSocialAuth(showDemoModal, { email: customEmail, name: customName })}
                disabled={loadingProvider !== null}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                {loadingProvider ? 'Signing in...' : 'Confirm Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
