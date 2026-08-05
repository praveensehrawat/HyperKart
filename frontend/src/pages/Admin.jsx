import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../components/Toast'

export default function Admin() {
  const { user } = useSelector((s) => s.auth)
  const navigate = useNavigate()
  const [status, setStatus] = useState({ running: false, rate: 15000 })
  const [rateInput, setRateInput] = useState(15000)
  const [tab, setTab] = useState('controls')
  const [usersList, setUsersList] = useState([])
  const toast = useToast()

  const [adminEmail, setAdminEmail] = useState('admin@HYPERKART.com')

  useEffect(() => {
    api.get('/public/test-admin-email')
      .then(({ data }) => {
        if (data && data.testAdminEmail) setAdminEmail(data.testAdminEmail)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      toast('Access Denied: Admin authorization required. Please login as Admin.', 'error')
      navigate('/login')
    }
  }, [user, navigate, toast])

  /**
   * Fetches the current background event publisher status.
   */
  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/admin/publisher/status')
      setStatus(data)
    } catch (e) {
      toast('Failed to fetch status', 'error')
    }
  }

  // Load user accounts directory when tab switches to 'users'
  const loadUsersList = () => {
    api.get('/users/all')
      .then(({ data }) => setUsersList(data))
      .catch(() => toast('Failed to load user accounts directory', 'error'))
  }

  // Fetch status on initialization
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchStatus()
    }
  }, [user])

  // Poll publisher updates count while admin console is kept open
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const id = setInterval(fetchStatus, 5000)
      return () => clearInterval(id)
    }
  }, [user])

  useEffect(() => {
    if (user?.role === 'ADMIN' && tab === 'users') {
      loadUsersList()
    }
  }, [user, tab])

  if (!user || user.role !== 'ADMIN') {
    return null
  }

  const handleForceLogout = async (userId, userName) => {
    try {
      await api.post(`/users/${userId}/force-logout`)
      toast(`User "${userName}" was forcefully logged out! 🚫`, 'success')
      loadUsersList()
    } catch (e) {
      toast('Failed to force logout user', 'error')
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${userName}"?`)) return
    try {
      await api.delete(`/users/${userId}`)
      toast(`User account "${userName}" deleted permanently! 🗑️`, 'success')
      loadUsersList()
    } catch (e) {
      toast('Failed to delete user account: ' + (e.response?.data?.message || e.message), 'error')
    }
  }

  /**
   * Seeds demo products into the system for local testing.
   */
  const doSeed = async () => {
    try {
      const { data } = await api.post('/admin/seed')
      toast(`Seeded ${data.inserted} demo products`, 'success')
      fetchStatus()
    } catch (e) { toast('Seed failed', 'error') }
  }

  /**
   * Starts the background simulation publisher that posts random stock updates.
   */
  const start = async () => {
    try { 
      await api.post('/admin/publisher/start')
      toast('Publisher started successfully', 'success')
      fetchStatus() 
    } catch (e) { toast('Start failed', 'error') }
  }

  /**
   * Stops the background simulation publisher.
   */
  const stop = async () => {
    try { 
      await api.post('/admin/publisher/stop')
      toast('Publisher stopped', 'info')
      fetchStatus() 
    } catch (e) { toast('Stop failed', 'error') }
  }

  /**
   * Sets the interval rate for the publisher background updates.
   */
  const setRate = async () => {
    try { 
      await api.post('/admin/publisher/rate', { rate: Number(rateInput) })
      toast('Update frequency rate adjusted', 'success')
      fetchStatus() 
    } catch (e) { toast('Update rate failed', 'error') }
  }

  /**
   * Triggers a mock real-time order update for testing live updates.
   */
  const triggerOrder = async () => {
    try { 
      await api.post('/realtime/trigger-order')
      toast('Mock order event triggered over WS broker', 'success') 
    } catch (e) { toast('Trigger failed', 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <span className="text-xs bg-pink-500/15 border border-pink-500/20 text-pink-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-2 inline-block">
          🛡 Administrator Console
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Admin Dashboard</h2>
        <p className="text-gray-400 text-sm font-medium">Verify system metrics status, toggle periodic event simulators, and load demo seed database.</p>
      </div>

      {/* Admin Tab Controls */}
      <div className="flex gap-2">
        <button 
          onClick={() => setTab('controls')} 
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'controls' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md' : 'bg-slate-900 border border-white/5 text-gray-400 hover:text-white'}`}
        >
          ⚙ System Simulator Controls
        </button>
        <button 
          onClick={() => setTab('users')} 
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${tab === 'users' ? 'bg-indigo-600 border border-indigo-500/20 text-white shadow-md' : 'bg-slate-900 border border-white/5 text-gray-400 hover:text-white'}`}
        >
          👥 Registered User Accounts
        </button>
      </div>

      {tab === 'controls' ? (
        <div className="glass-card p-6 max-w-lg space-y-6 font-Outfit">
          <div className="pb-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Database Initializer</h3>
            <button 
              onClick={doSeed} 
              className="bg-indigo-600 border border-indigo-500/20 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 hover:scale-103 active:scale-95 transition-all cursor-pointer text-xs"
            >
              🌱 Seed Marketplace Demo Catalog
            </button>
          </div>
          
          <div className="pb-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Publisher Simulator Controls</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={start} 
                className="px-4 py-2.5 bg-emerald-600 border border-emerald-500/20 text-white rounded-xl font-bold hover:bg-emerald-500 hover:scale-103 transition-all cursor-pointer text-xs"
              >
                🟢 Start Publisher
              </button>
              <button 
                onClick={stop} 
                className="px-4 py-2.5 bg-rose-600 border border-rose-500/20 text-white rounded-xl font-bold hover:bg-rose-500 hover:scale-103 transition-all cursor-pointer text-xs"
              >
                🔴 Stop Publisher
              </button>
              <button 
                onClick={triggerOrder} 
                className="px-4 py-2.5 bg-amber-600 border border-amber-500/20 text-white rounded-xl font-bold hover:bg-amber-500 hover:scale-103 transition-all cursor-pointer text-xs"
              >
                ⚡ Trigger Mock Order Event
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Adjustment Frequency Rate</h3>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={rateInput} 
                onChange={(e) => setRateInput(e.target.value)} 
                className="w-32 bg-slate-950 border border-white/10 text-white rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-center font-mono font-bold" 
              />
              <button 
                onClick={setRate} 
                className="px-4 py-2 bg-indigo-600 border border-indigo-500/20 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all cursor-pointer text-xs"
              >
                Adjust Rate (ms)
              </button>
            </div>
          </div>
          
          {/* Live metrics monitoring card */}
          <div className="mt-4 border-t border-white/5 pt-4 space-y-2.5 text-xs font-semibold text-gray-400">
            <p className="flex justify-between">
              <span>Publisher Simulation Running:</span> 
              <span className={`font-mono font-bold ${status.running ? 'text-emerald-400' : 'text-rose-400'}`}>{status.running ? 'ONLINE' : 'OFFLINE'}</span>
            </p>
            <p className="flex justify-between">
              <span>Broadcast Speed Rate:</span> 
              <span className="font-mono text-gray-200">{status.rate} ms</span>
            </p>
            <p className="flex justify-between">
              <span>Total Broadcasted Events:</span> 
              <span className="font-mono text-gray-200">{status.publishedCount ?? 0}</span>
            </p>
            <p className="flex justify-between">
              <span>Last Broadcast Event:</span> 
              <span className="font-mono text-gray-200">{status.lastPublishedAt ? new Date(status.lastPublishedAt).toLocaleTimeString() : '—'}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 space-y-4 font-Outfit">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-lg font-bold text-gray-200">Registered Accounts Directory</h3>
              <p className="text-xs text-gray-400 mt-0.5">Manage user credentials, client IP addresses, active session statuses, and account authorizations.</p>
            </div>
            <span className="text-[11px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-xl font-mono font-extrabold shadow-sm self-start sm:self-auto">
              Total Users: {usersList.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-2xl bg-slate-950/60 backdrop-blur-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10 font-mono">
                  <th className="py-3.5 px-4">User Details</th>
                  <th className="py-3.5 px-4">Account Role</th>
                  <th className="py-3.5 px-4">Client IP Address</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4">Session Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 text-xs">
                      No registered user accounts found in database directory.
                    </td>
                  </tr>
                )}
                {usersList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-indigo-500/5 transition-colors">
                    {/* User Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-gray-100 text-xs">{usr.name}</div>
                      <div className="text-[11px] text-indigo-400 font-mono">{usr.email}</div>
                    </td>

                    {/* Account Role */}
                    <td className="py-3.5 px-4">
                      <span 
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border inline-block ${
                          usr.role === 'ADMIN' ? 'bg-pink-500/15 border-pink-500/30 text-pink-300' :
                          usr.role === 'SELLER' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                          usr.role === 'DRIVER' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' :
                          'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                        }`}
                      >
                        {usr.role}
                      </span>
                    </td>

                    {/* Client IP Address */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                      🌐 {usr.lastLoginIp || '127.0.0.1'}
                    </td>

                    {/* Last Activity */}
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-[11px]">
                      {usr.lastLoginAt ? new Date(usr.lastLoginAt).toLocaleString() : 'Recent Session'}
                    </td>

                    {/* Session Status */}
                    <td className="py-3.5 px-4">
                      {usr.forceLoggedOut ? (
                        <span className="text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-bold inline-block">
                          🚫 Terminated
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold inline-block">
                          🟢 Active
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleForceLogout(usr.id, usr.name)}
                          className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Terminate active user session"
                        >
                          <span>🚫</span> Logout
                        </button>

                        {usr.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(usr.id, usr.name)}
                            className="bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-md"
                            title="Permanently remove user account"
                          >
                            <span>🗑️</span> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
