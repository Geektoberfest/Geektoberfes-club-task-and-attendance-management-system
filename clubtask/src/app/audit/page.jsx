'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { authFetch } from '@/lib/ClientFetch'

const PAGE_SIZE = 25
const ACTIONS = ['', 'event.create', 'event.delete', 'task.create', 'task.update', 'attendance.mark', 'user.signup', 'user.login']
const RESOURCES = ['', 'event', 'task', 'attendance', 'user']
const EMPTY_FILTERS = { action: '', resourceType: '', from: '', to: '' }

export default function AuditPage() {
  const [role, setRole] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState(EMPTY_FILTERS)
  const [skip, setSkip] = useState(0)
  const [data, setData] = useState({ total: 0, entries: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || 'member')
  }, [])

  useEffect(() => {
    if (role !== 'lead') return
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) })
      for (const [key, value] of Object.entries(applied)) {
        if (value) params.set(key, key === 'to' ? `${value}T23:59:59.999Z` : key === 'from' ? `${value}T00:00:00.000Z` : value)
      }
      try {
        const res = await authFetch(`/api/audit-logs?${params.toString()}`)
        if (!mounted) return
        if (res.ok) setData(res.data)
        else setError(res.data?.error || 'Could not load the audit log')
      } catch (e) {
        console.warn('audit log fetch failed', e)
        if (mounted) setError('Could not load the audit log')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [role, applied, skip])

  const applyFilters = (e) => {
    e.preventDefault()
    setSkip(0)
    setApplied(filters)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setSkip(0)
    setApplied(EMPTY_FILTERS)
  }

  if (role === null) return <MainLayout />

  if (role !== 'lead') {
    return (
      <MainLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">AUDIT_LOG</h2>
          <p className="text-gray-400">Only club leads can view the audit log.</p>
        </div>
      </MainLayout>
    )
  }

  const inputClass = 'w-full px-3 py-2 rounded bg-gray-800 border border-green-700 text-white'
  const page = Math.floor(skip / PAGE_SIZE) + 1
  const pages = Math.max(Math.ceil(data.total / PAGE_SIZE), 1)

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">AUDIT_LOG</h2>

        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className={inputClass}>
            {ACTIONS.map(a => <option key={a} value={a}>{a || 'All actions'}</option>)}
          </select>
          <select value={filters.resourceType} onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })} className={inputClass}>
            {RESOURCES.map(r => <option key={r} value={r}>{r || 'All resources'}</option>)}
          </select>
          <input type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className={inputClass} />
          <input type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className={inputClass} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded">[ APPLY ]</button>
            <button type="button" onClick={clearFilters} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded">[ CLEAR ]</button>
          </div>
        </form>

        {error && <div className="text-red-400 mb-4">{error}</div>}
        {loading && <div className="text-gray-400 mb-4">Loading...</div>}

        {!loading && !error && data.entries.length === 0 && <div className="text-gray-400">No audit entries match these filters.</div>}

        {data.entries.length > 0 && (
          <div className="overflow-x-auto border border-green-900/50 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-900/60 text-green-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Who</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {data.entries.map(entry => (
                  <tr key={entry._id} className="border-t border-green-900/40 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{entry.actor?.name || entry.actor?.email || 'unknown'} <span className="text-gray-500">({entry.actorRole})</span></td>
                    <td className="px-3 py-2">{entry.action}</td>
                    <td className="px-3 py-2">{entry.resourceType}{entry.resourceId ? <span className="text-gray-500"> {entry.resourceId}</span> : null}</td>
                    <td className="px-3 py-2 text-gray-400">{Object.keys(entry.details || {}).length ? JSON.stringify(entry.details) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-300">
            <button disabled={skip === 0} onClick={() => setSkip(Math.max(skip - PAGE_SIZE, 0))} className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40">&lt; Prev</button>
            <span>Page {page} of {pages} · {data.total} entries</span>
            <button disabled={skip + PAGE_SIZE >= data.total} onClick={() => setSkip(skip + PAGE_SIZE)} className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40">Next &gt;</button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
