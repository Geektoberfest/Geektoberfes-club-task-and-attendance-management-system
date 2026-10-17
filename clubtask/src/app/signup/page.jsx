'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import PasswordInput from '@/components/PasswordInput'

export default function SignUpPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('')
  const [position, setPosition] = useState('')
  const [password, setPassword] = useState('')

  const handleSignup = async () => {
  if (!username.trim()) return alert('Enter username');
  if (!email.trim()) return alert('Enter email');
  if (!password.trim()) return alert('Enter password');

  const payload = {
    name: username.trim(),
    email: email.trim(),
    password: password.trim(),
    position: position || 'Member',
    domain: domain || ''
  };

  console.log('[SIGNUP DEBUG] payload ->', payload);

  try {
    const url = '/api/auth/signup';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('[SIGNUP DEBUG] raw response', res);
    const text = await res.text().catch(()=>null);
    console.log('[SIGNUP DEBUG] response text', text);

    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch(e) { data = { raw: text }; }

    if (!res.ok) {
      console.warn('[SIGNUP DEBUG] server returned error', res.status, data);
      return alert(data?.error || data?.message || `Signup failed (${res.status})`);
    }

    console.log('[SIGNUP DEBUG] signup success', data);
    if (data.token) localStorage.setItem('token', data.token);
    if (data.user?.id) localStorage.setItem('userId', data.user.id);
    localStorage.setItem('profileName', data.user?.name || username.trim());
    localStorage.setItem('email', data.user?.email || email.trim());
    localStorage.setItem('position', data.user?.position || position || 'Member');
    localStorage.setItem('domain', data.user?.domain || domain || '');
    localStorage.setItem('userRole', (data.user?.position || position || '').toLowerCase().includes('lead') ? 'lead' : 'member');

    // redirect
    const resolvedRole = (data.user?.position || position || '').toLowerCase().includes('lead') ? 'lead' : 'member';
    if (resolvedRole === 'lead') router.push('/domains'); else router.push('/board');

  } catch (err) {
    console.error('[SIGNUP DEBUG] fetch threw', err);
    alert('Network error during signup — check console and server logs');
  }
}

  return (
    <div className="min-h-screen bg-linear-to-r from-gray-900 via-black to-gray-900">
      <Header />

      <div className="flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-3xl">
          <div className="border-2 border-blue-500/50 rounded-lg bg-gray-900/80 backdrop-blur p-6 sm:p-8 shadow-2xl shadow-blue-500/20">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">SIGNUP MODULE</h2>
              <p className="text-sm text-green-400">&gt; CREATE YOUR ACCOUNT</p>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSignup() }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block text-white mb-2 font-bold">USERNAME</label>
                <input
                  type="text"
                  placeholder="> enter_username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-500 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-bold">EMAIL</label>
                <input
                  type="email"
                  placeholder="> enter_email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-500 rounded px-4 py-3 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white mb-2 font-bold">PASSWORD</label>
                <PasswordInput
                  placeholder="> enter_password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-700 rounded px-4 py-3 text-green-700 placeholder-green-600 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>

              {/* Domain select */}
              <div>
                <label className="block text-white mb-2 font-bold">DOMAIN</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-700 rounded px-4 py-3 text-green-900 focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select domain</option>
                  <option value="Technical">Technical</option>
                  <option value="Management">Management</option>
                  <option value="Public Relation">Public Relation</option>
                  <option value="Graphics">Graphics</option>
                  <option value="Media">Media</option>
                </select>
              </div>

              {/* Position select */}
              <div>
                <label className="block text-white mb-2 font-bold">POSITION</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-black/50 border-2 border-green-700 rounded px-4 py-3 text-green-900 focus:outline-none focus:border-green-500 transition-colors"
                >
                  <option value="">Select position</option>
                  <option value="President">President</option>
                  <option value="Vice-President">Vice-President</option>
                  <option value="Lead">Lead</option>
                  <option value="Member">Member</option>
                </select>
              </div>

              <div className="md:col-span-2 flex justify-center mt-2">
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-green-500/50"
                >
                  [ SIGN UP ]
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}