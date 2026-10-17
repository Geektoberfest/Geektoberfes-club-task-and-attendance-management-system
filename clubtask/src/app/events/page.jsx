'use client'

import MainLayout from '@/components/MainLayout'
import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/ClientFetch'
import { DOMAINS } from '@/data/domains'
import { apiErrorMessage } from '@/lib/apiError'
import LoadError from '@/components/LoadError'

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function Overlay({ open, onClose, title, width = 'w-full sm:max-w-lg', children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-start sm:pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`${width} relative bg-gray-900 border border-green-700/40 rounded-t-xl sm:rounded-xl p-4 sm:p-5 z-50 mx-4`}>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-sm bg-gray-800 px-2 py-1 rounded">X</button>
        {title && <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export default function EventsPage() {
  const [role, setRole] = useState('member')
  const [events, setEvents] = useState([])
  const [attendanceState, setAttendanceState] = useState({})
  const [membersList, setMembersList] = useState([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openAttendFor, setOpenAttendFor] = useState(null)
  const [openDescFor, setOpenDescFor] = useState(null)
  const [editingAttendance, setEditingAttendance] = useState({})
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('')
  const [desc, setDesc] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    let failure = ''

    try {
      // 1) Members list
      try {
        const mr = await authFetch('/api/members')
        if (mr && mr.ok && Array.isArray(mr.data) && mr.data.length) {
          setMembersList(mr.data.map(m => ({ id: String(m._id || m.id), name: m.name || m.email || 'Unknown', domain: m.domain || '' })))
        } else {
          if (!mr?.ok) failure = apiErrorMessage(mr)
          setMembersList(DOMAINS.flatMap(d => d.members.map(m => ({ id: m.id, name: m.name, domain: d.name }))))
        }
      } catch (err) {
        console.warn('members fetch failed; using fallback DOMAINS', err)
        failure = apiErrorMessage(null)
        setMembersList(DOMAINS.flatMap(d => d.members.map(m => ({ id: m.id, name: m.name, domain: d.name }))))
      }

      // 2) Events + attendance
      try {
        const res = await authFetch('/api/events')
        let rawEvents = []
        if (res && res.ok && Array.isArray(res.data)) rawEvents = res.data
        else {
          failure = apiErrorMessage(res)
          const stored = localStorage.getItem('events')
          rawEvents = stored ? JSON.parse(stored) : []
        }

        const normalized = rawEvents.map(e => ({
          id: String(e._id || e.id || Math.random()),
          title: e.title || e.name || '',
          date: fmtDate(e.date),
          time: e.time || '',
          location: e.location || '',
          description: e.description || '',
          color: e.color || '',
          raw: e
        }))
        setEvents(normalized)

        const state = {}
        for (const ev of normalized) {
          try {
            const queryId = ev.raw && (ev.raw._id || ev.raw.id) ? (ev.raw._id || ev.raw.id) : ev.id
            const ares = await authFetch(`/api/attendance?eventId=${queryId}`)
            if (ares && ares.ok && Array.isArray(ares.data)) {
              const map = {}
              ares.data.forEach(a => {
                const memberId = a.member && typeof a.member === 'object' ? String(a.member._id || a.member.id) : String(a.member || a.memberId || a.member_id || '')
                if (!memberId) return
                map[memberId] = a.status || a.attendance || (a.present ? 'present' : 'absent')
              })
              state[ev.id] = map
              try { localStorage.setItem(`attendance-${ev.id}`, JSON.stringify(map)) } catch {}
              continue
            }
          } catch (err) {
            console.warn('attendance fetch failed for', ev.id, err)
          }
          try {
            const rawA = localStorage.getItem(`attendance-${ev.id}`)
            state[ev.id] = rawA ? JSON.parse(rawA) : {}
          } catch {
            state[ev.id] = {}
          }
        }
        setAttendanceState(state)
      } catch (err) {
        console.warn('Event load failed', err)
        failure = apiErrorMessage(null)
        setEvents([])
      }
    } finally {
      setLoadError(failure)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setRole(localStorage.getItem('userRole') || 'member')
    loadEvents()
  }, [loadEvents])

  const appendBoardTask = async (evt) => {
    try {
      const payload = {
        title: evt.title,
        timeline: evt.date || evt.time || '—',
        color: evt.color || 'green',
        columnId: 'backlog',
        meta: { type: 'event', venue: evt.location, description: evt.description || '' }
      }
      const res = await authFetch('/api/tasks', { method: 'POST', body: JSON.stringify(payload) })
      if (res && res.ok && res.data) return res.data
    } catch (e) {}
    return null
  }

  const saveEvent = async () => {
    if (role !== 'lead') return alert('Only lead can create events')
    if (!name.trim()) return alert('Enter event name')

    try {
      const res = await authFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({ title: name.trim(), date, time, location: venue, description: desc })
      })
      if (res && res.ok && res.data) {
        const e = res.data
        const mapped = {
          id: String(e._id || e.id || Math.random()),
          title: e.title,
          date: fmtDate(e.date),
          time: e.time || '',
          location: e.location || '',
          description: e.description || '',
          color: e.color || '',
          raw: e
        }
        setEvents(prev => [mapped, ...prev])
        await appendBoardTask(mapped)
      }
    } catch (err) {
      console.warn('fallback create failed', err)
    }

    setName(''); setDate(''); setTime(''); setVenue(''); setDesc('')
    setOpenCreate(false)
  }

  const requestDelete = (ev) => {
    if (role !== 'lead') return
    setDeleteError('')
    setPendingDelete({ id: ev.id, title: ev.title })
  }

  const cancelDelete = () => {
    if (deleting) return
    setPendingDelete(null)
    setDeleteError('')
  }

  // the card is only removed after the server confirms the delete
  const confirmDelete = async () => {
    if (role !== 'lead' || !pendingDelete) return
    const { id } = pendingDelete
    setDeleting(true)
    setDeleteError('')

    try {
      const res = await authFetch(`/api/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res && res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id))
        setAttendanceState(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
        setPendingDelete(null)
        return
      }
      setDeleteError('Could not delete this event. Please try again.')
    } catch (err) {
      console.warn('delete failed', err)
      setDeleteError('Could not delete this event. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const openAttendanceEditor = async (eventId) => {
    if (role !== 'lead') return
    const existing = attendanceState[eventId] || {}

    try {
      const event = events.find(e => e.id === eventId)
      const eventQueryId = event?.raw && (event.raw._id || event.raw.id) ? (event.raw._id || event.raw.id) : eventId
      const res = await authFetch(`/api/attendance?eventId=${eventQueryId}`)
      if (res && res.ok && Array.isArray(res.data)) {
        const map = {}
        res.data.forEach(a => {
          const memberId = a.member && typeof a.member === 'object' ? String(a.member._id || a.member.id) : String(a.member || a.memberId || a.member_id || '')
          if (!memberId) return
          map[memberId] = a.status || a.attendance || (a.present ? 'present' : 'absent')
        })
        // ensure every member has a value (default present)
        const merged = {}
        const members = membersList.length ? membersList : []
        members.forEach(m => { merged[m.id] = map[m.id] || 'present' })
        setEditingAttendance(merged)
        setOpenAttendFor(eventId)
        return
      }
    } catch (err) {
      console.warn('openAttendanceEditor fetch failed', err)
    }

    // fallback: build from existing state or default present
    const merged = {}
    const members = membersList.length ? membersList : []
    members.forEach(m => { merged[m.id] = existing[m.id] || 'present' })
    setEditingAttendance(merged)
    setOpenAttendFor(eventId)
  }

  // Save attendance
  const saveAttendance = async (eventId) => {
    if (role !== 'lead') return
    if (!editingAttendance || typeof editingAttendance !== 'object') return

    try {
      const event = events.find(e => e.id === eventId)
      const eventQueryId = event?.raw && (event.raw._id || event.raw.id) ? (event.raw._id || event.raw.id) : eventId

      const res = await authFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ eventId: eventQueryId, attendance: editingAttendance })
      })

      let newMap = {}
      if (res && res.ok && Array.isArray(res.data) && res.data.length) {
        res.data.forEach(d => {
          const mid = d.member && typeof d.member === 'object' ? String(d.member._id || d.member.id) : String(d.member || d.memberId || d.member_id || '')
          if (mid) newMap[mid] = d.status || d.attendance || (d.present ? 'present' : 'absent')
        })
      } else {
        newMap = { ...editingAttendance }
      }

      setAttendanceState(prev => ({ ...prev, [eventId]: newMap }))
      try { localStorage.setItem(`attendance-${eventId}`, JSON.stringify(newMap)) } catch {}
      setOpenAttendFor(null)
      setEditingAttendance({})
      return
    } catch (err) {
      console.error('saveAttendance failed', err)
      setAttendanceState(prev => ({ ...prev, [eventId]: { ...editingAttendance } }))
      try { localStorage.setItem(`attendance-${eventId}`, JSON.stringify(editingAttendance)) } catch {}
      setOpenAttendFor(null)
      setEditingAttendance({})
    }
  }

  const cardGreenClass = 'border-green-500 bg-green-950/20'

  return (
    <MainLayout hudType="events">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">EVENT_TIMELINE</h2>

          {role === 'lead' ? (
            <button onClick={() => setOpenCreate(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded">
              + Upcoming_Schedule
            </button>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-300 rounded">Upcoming Schedule</div>
          )}
        </div>

        {loadError && <LoadError message={loadError} onRetry={loadEvents} />}
        {loading && <p className="text-sm text-gray-400 mb-4">Loading events...</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {events.map(ev => (
            <div key={ev.id} className={`${cardGreenClass} rounded-lg p-3 sm:p-4 hover:scale-105 relative border-2`}>
              {role === 'lead' && (
                <button
                  onClick={(e) => { e.stopPropagation(); requestDelete(ev) }}
                  className="absolute top-0 right-2 text-xs text-red-400 hover:text-red-300"
                >
                  x
                </button>
              )}

              <div onClick={() => setOpenDescFor(ev)} className="cursor-pointer">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-xs">{ev.date}</span>
                  <span className="text-xs text-gray-300 absolute right-2 top-4">{ev.time}</span>
                </div>

                <h3 className="text-white font-bold mb-1 text-sm">{ev.title}</h3>
                <p className="text-gray-400 text-xs mb-3">Location: {ev.location}</p>
              </div>

              {role === 'lead' && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openAttendanceEditor(ev.id) }}
                    className="px-2 py-2 bg-green-600/50 text-white border-2 rounded text-xs"
                  >
                    Mark Attendance
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <div className="text-xs text-gray-300">Present: <span className="font-medium text-white ml-1">{Object.values(attendanceState[ev.id] || {}).filter(s => s === 'present').length}</span></div>
                    <div className="text-xs text-gray-300">Absent: <span className="font-medium text-white ml-1">{Object.values(attendanceState[ev.id] || {}).filter(s => s === 'absent').length}</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CREATE EVENT OVERLAY */}
      <Overlay open={openCreate} onClose={() => setOpenCreate(false)} title="Create Event" width="w-full sm:max-w-xl">
        <div className="space-y-3">
          <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Date (YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Time" value={time} onChange={(e) => setTime(e.target.value)} />
          <input className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
          <textarea className="w-full px-3 py-2 bg-gray-800 text-white rounded" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpenCreate(false)} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
            <button onClick={saveEvent} className="px-3 py-2 rounded bg-green-600 text-black">Create</button>
          </div>
        </div>
      </Overlay>

      {/* ATTENDANCE OVERLAY (shows member list and allows marking) */}
      <Overlay open={!!openAttendFor} onClose={() => { setOpenAttendFor(null); setEditingAttendance({}) }} title="Mark Attendance" width="w-full sm:max-w-2xl">
        {openAttendFor && (
          <div className="space-y-4">
            <div className="text-sm text-gray-300 mb-1">Event: <span className="text-white font-semibold">{events.find(e => e.id === openAttendFor)?.title}</span></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-auto">
              {(membersList.length ? membersList : []).map(m => {
                const status = editingAttendance[m.id] || 'present'
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded bg-gray-800/30">
                    <div>
                      <div className="text-white font-medium">{m.name}</div>
                      <div className="text-xs text-gray-400">{m.domain}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingAttendance(prev => ({ ...prev, [m.id]: 'present' }))} className={`px-3 py-1 rounded ${status === 'present' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>Present</button>
                      <button onClick={() => setEditingAttendance(prev => ({ ...prev, [m.id]: 'absent' }))} className={`px-3 py-1 rounded ${status === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-700 text-white'}`}>Absent</button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => { setOpenAttendFor(null); setEditingAttendance({}) }} className="px-3 py-2 rounded bg-gray-700">Cancel</button>
              <button onClick={() => saveAttendance(openAttendFor)} className="px-3 py-2 rounded bg-green-600 text-black">Save Attendance</button>
            </div>
          </div>
        )}
      </Overlay>

      {/* DESCRIPTION OVERLAY */}
      <Overlay open={!!openDescFor} onClose={() => setOpenDescFor(null)} title="Event Details">
        {openDescFor && (
          <div>
            <div className="text-sm text-gray-300 mb-2">Title: <span className="text-white font-semibold">{openDescFor.title}</span></div>
            <div className="text-sm text-gray-300 mb-2">When: <span className="text-white">{openDescFor.date} {openDescFor.time}</span></div>
            <div className="text-sm text-gray-300 mb-2">Where: <span className="text-white">{openDescFor.location}</span></div>
            <div className="text-sm text-gray-300 mb-2">Description:</div>
            <div className="text-gray-300">{openDescFor.description}</div>
          </div>
        )}
      </Overlay>

      {/* DELETE CONFIRMATION */}
      <Overlay open={!!pendingDelete} onClose={cancelDelete} title="Delete event?" width="w-full sm:max-w-md">
        {pendingDelete && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              This will permanently delete <span className="text-white font-semibold">{pendingDelete.title}</span>.
            </p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={cancelDelete} disabled={deleting} className="px-3 py-2 rounded bg-gray-700 disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Overlay>
    </MainLayout>
  )
}