'use client'

import MainLayout from '@/components/MainLayout'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAINS } from '@/data/domains'
import { authFetch } from '@/lib/ClientFetch'
import { apiErrorMessage } from '@/lib/apiError'
import LoadError from '@/components/LoadError'

export default function DomainsPage() {
  const [expandedDomainId, setExpandedDomainId] = useState(null)
  const [domainMembersMap, setDomainMembersMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const router = useRouter()

  const toggleDomain = (domainId) => {
    setExpandedDomainId(prev => (prev === domainId ? null : domainId))
  }

  const openMemberBoard = (domainId, member) => {
    const url = `/board?domain=${encodeURIComponent(domainId)}&member=${encodeURIComponent(member.id)}`
    router.push(url)
  }

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await authFetch('/api/members')
      if (res && res.ok && Array.isArray(res.data)) {
        const map = {}
        res.data.forEach(u => {
          const domainKey = u.domain || (u.domainName) || 'Unknown'
          const item = { id: String(u._id || u.id || u._uid || u.uuid || ''), name: u.name || u.username || u.email || 'Unknown', domain: domainKey, email: u.email || '' }
          if (!map[domainKey]) map[domainKey] = []
          map[domainKey].push(item)
        })
        setDomainMembersMap(map)
        return
      }
      setLoadError(apiErrorMessage(res))
    } catch (e) {
      console.warn('fetch /api/members failed, falling back to DOMAINS', e)
      setLoadError(apiErrorMessage(null))
    } finally {
      setLoading(false)
    }

    // static domain data keeps the page usable while the error is shown
    const fallback = {}
    DOMAINS.forEach(d => {
      fallback[d.name] = d.members.map(m => ({ id: m.id, name: m.name, domain: d.name }))
    })
    setDomainMembersMap(fallback)
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  return (
    <MainLayout>
      <div className="p-6 max-w-8xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Domains</h1>

        {loadError && <LoadError message={loadError} onRetry={loadMembers} />}
        {loading && <p className="text-sm text-gray-400 mb-4">Loading members...</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOMAINS.map((domain) => (
            <div key={domain.id} className="w-full">

              {/* Domain Card */}
              <button
                onClick={() => toggleDomain(domain.id)}
                className={`w-full text-left cursor-pointer rounded-lg p-5 border transition-all duration-150 
                  ${expandedDomainId === domain.id ? 'shadow-xl bg-gray-800/60 border-green-500' : 'bg-gray-900/40 hover:shadow-lg'}
                `}
              >
                <h3 className="text-xl font-semibold text-white">{domain.name}</h3>
                <p className="text-sm text-green-300">{domain.desc}</p>
                <p className="text-xs text-gray-400 mt-2">{(domainMembersMap[domain.name] || domain.members).length} members</p>
                <div className="text-sm text-green-400 mt-2">
                  {expandedDomainId === domain.id ? '[−] collapse' : '[+] expand'}
                </div>
              </button>

              {expandedDomainId === domain.id && (
                <div className="mt-4 bg-gray-900/40 border border-green-800 rounded-lg p-4">

                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold text-lg">{domain.name} Members</h4>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {(domainMembersMap[domain.name] || domain.members).map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-row items-center justify-between p-2 w-80 border rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition cursor-pointer"
                      >
                        <div>
                          <p className="text-white font-semibold text-lg">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.domain}</p>
                        </div>

                        <button
                          onClick={() => openMemberBoard(domain.id, m)}
                          className="px-3 py-2 border-2 border-green-600 bg-green-500 text-black rounded font-semibold hover:bg-green-600 transition"
                        >
                          TO_BOARD
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
