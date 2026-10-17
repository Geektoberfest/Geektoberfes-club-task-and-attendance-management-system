'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import PasswordInput from '@/components/PasswordInput'
import { authFetch } from '@/lib/ClientFetch'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
const handleLoginAs = async (role) => {
  if (username.trim() && password.trim()) {
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: username.trim(), password: password.trim() })
      });

      if (!res.ok) {
        const errMsg = res.data?.error || res.data?.message || 'Login failed';
        return alert(errMsg);
      }

      const json = res.data || {};
      if (json.token) localStorage.setItem('token', json.token);
      if (json.user?.id) localStorage.setItem('userId', json.user.id);

      const resolvedRole = (json.user?.position || '').toLowerCase().includes('lead') ? 'lead' : (role || 'member');
      localStorage.setItem('userRole', resolvedRole);

      if (json.user) {
        localStorage.setItem('profileName', json.user.name || '');
        localStorage.setItem('email', json.user.email || '');
        localStorage.setItem('position', json.user.position || '');
        localStorage.setItem('domain', json.user.domain || '');
      }

      if (resolvedRole === 'lead') router.push('/domains');
      else router.push('/board');
      return;
    } catch (e) {
      console.warn('Login request failed', e);
      return alert('Network error during login');
    }
  }
  
  try { localStorage.setItem('userRole', role); } catch (e) { console.warn(e); }
  router.push('/board');
}

const handleSignUp = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  } catch (err) {
    console.warn('Could not clear old auth data', err);
  }
  router.push('/signup');
}

  return (
    <div className="min-h-screen bg-linear-to-r from-gray-900 via-black to-gray-900">
      <Header />

      <div className="flex items-center justify-center h-[calc(100vh-88px)] bg-pattern">
        <div className="w-full max-w-2xl px-4">
          <div className="border-2 border-blue-500/50 rounded-lg bg-gray-900/80 backdrop-blur p-8 shadow-2xl shadow-blue-500/20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2 ">LOGIN_MODULE</h2>
              <p className="text-green-400">&gt; AUTHENTICATE_USER</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white mb-2 font-bold">USERNAME</label>
                <input
                  type="text"
                  placeholder="> enter_username (email) ..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-500 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-bold">PASSWORD</label>
                <PasswordInput
                  placeholder="> enter_password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded px-4 py-3 text-gray-400 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleLoginAs('lead')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/50"
                >[ AS A LEAD ]
                </button>

                <button
                  onClick={() => handleLoginAs('member')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/50"
                >[ AS A MEMBER ]
                </button>
              </div>

              <div className="flex justify-between text-sm">
                <button className="text-green-400 hover:text-green-300 transition-colors">
                  &gt; forgot_password?
                </button>
                <button
                  onClick={handleSignUp}
                  className="text-green-400 hover:text-green-300 transition-colors">
                  &gt; register_now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}