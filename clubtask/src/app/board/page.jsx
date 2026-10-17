'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import LoadError from '@/components/LoadError'
import { authFetch } from '@/lib/ClientFetch'
import { apiErrorMessage } from '@/lib/apiError'
export default function BoardPage() {
  // UI state
  const [openOverlay, setOpenOverlay] = useState(false)

  // form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskColumn, setTaskColumn] = useState('backlog')

  // data
  const [boardTasks, setBoardTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // routing / who we view
  const [viewedMemberId, setViewedMemberId] = useState(null)
  const [loggedInMemberId, setLoggedInMemberId] = useState(null)
  const [role, setRole] = useState('member')

  // helpers
  const uid = (p = '') => p + Date.now().toString(36).slice(-6)

  // column color helpers
  const borderForColumn = (col) => {
    if (col === 'backlog') return 'border-red-500'
    if (col === 'inprogress') return 'border-blue-500'
    if (col === 'done') return 'border-green-500'
    return 'border-gray-500'
  }
  const bgForColumn = (col) => {
    if (col === 'backlog') return 'bg-red-950/20'
    if (col === 'inprogress') return 'bg-blue-950/20'
    if (col === 'done') return 'bg-green-950/20'
    return 'bg-gray-900/20'
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const r = localStorage.getItem('userRole') || 'member'
    setRole(r)
    const tryKeys = ['currentMemberId', 'memberId', 'userId', 'username', 'currentUserId']
    let foundId = null
    for (const k of tryKeys) {
      const v = localStorage.getItem(k)
      if (!v) continue
      if (v && typeof v === 'string') {
        foundId = v
        break
      }
    }
    if (foundId) setLoggedInMemberId(foundId)
    const params = new URLSearchParams(window.location.search)
    const memberFromQuery = params.get('member')
    if (memberFromQuery) {
      if (foundId && memberFromQuery !== foundId && r !== 'lead') {
        setViewedMemberId(foundId)
      } else {
        setViewedMemberId(memberFromQuery)
      }
    } else {
      if (foundId) setViewedMemberId(foundId)
      else setViewedMemberId(null)
    }
  }, [])

  const loadTasks = useCallback(async () => {
    const memberId = viewedMemberId || loggedInMemberId
    setLoading(true)
    setLoadError('')
    let failure = ''

    try {
      if (memberId) {
        const res = await authFetch(`/api/tasks?assignee=${encodeURIComponent(memberId)}`)
        if (res && res.ok && Array.isArray(res.data)) {
          setBoardTasks(res.data)
          return
        }
        failure = apiErrorMessage(res)
      }
    } catch (e) {
      console.warn('load tasks failed', e)
      failure = apiErrorMessage(null)
    } finally {
      setLoadError(failure)
      setLoading(false)
    }

    // show tasks saved in this browser so the board is not blank while the error is displayed
    try {
      const raw = localStorage.getItem('boardTasks')
      const arr = raw ? JSON.parse(raw) : []
      setBoardTasks(memberId ? arr.filter(t => t.assignee === memberId) : arr)
    } catch (e) {
      console.warn('localStorage fallback failed', e)
      setBoardTasks([])
    }
  }, [viewedMemberId, loggedInMemberId])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // helpers to derive columns
  const backlog = boardTasks.filter(t => (t.columnId === 'backlog' || t.columnId === 'INITIALIZE' ))
  const inprogress = boardTasks.filter(t => (t.columnId === 'inprogress' || t.columnId === 'RUNNING PROCESSES'))
  const done = boardTasks.filter(t => (t.columnId === 'done' || t.columnId === 'DEPLOYED'))

  const persistNewTask = async (taskObj) => {
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskObj)
      })
      if (res && res.ok) {
        const refetch = await authFetch(`/api/tasks?assignee=${encodeURIComponent(taskObj.assignee)}`)
        if (refetch && refetch.ok && Array.isArray(refetch.data)) {
          setBoardTasks(refetch.data)
          return
        }
      }
    } catch (e) {
      console.warn('backend persist failed, using localStorage fallback', e)
    }

    try {
      const raw = localStorage.getItem('boardTasks'); const arr = raw ? JSON.parse(raw) : []
      const toSave = { id: uid('t-'), ...taskObj }
      arr.unshift(toSave)
      localStorage.setItem('boardTasks', JSON.stringify(arr))

      if (!taskObj.assignee || taskObj.assignee === viewedMemberId || (!viewedMemberId && taskObj.assignee === loggedInMemberId)) {
        setBoardTasks(prev => [toSave, ...prev])
      }
    } catch (e) { console.warn('localStorage write failed', e) }
  }

  const handleSaveTask = () => {
    if (!taskTitle.trim()) return alert('Enter task title')

    const assignee = viewedMemberId || loggedInMemberId || null

    const newTask = {
      title: taskTitle.trim(),
      timeline: taskDate || new Date().toLocaleDateString(),
      columnId: taskColumn,
      assignee,
      createdAt: new Date().toISOString()
    }

    persistNewTask(newTask)
    setTaskTitle(''); setTaskDate(''); setTaskColumn('backlog'); setOpenOverlay(false)
  }

  return (
    <MainLayout hudType="board">
      {/* Floating Overlay */}
      {openOverlay && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpenOverlay(false)}></div>
          <div className="relative bg-gray-900 border border-green-500/40 rounded-xl shadow-2xl w-[92%] sm:w-[420px] p-5 z-50 mx-4">
            <button onClick={() => setOpenOverlay(false)} className="absolute top-2 right-2 text-sm bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-white">X</button>

            <h2 className="text-green-400 font-bold text-lg mb-3">EXECUTE NEW TASK</h2>

            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} type="text" placeholder="Task Title"
              className="w-full mb-3 px-3 py-2 rounded bg-gray-800 border border-green-700 text-white" />

            <div className="flex gap-2 mb-3">
              <input value={taskDate} onChange={(e) => setTaskDate(e.target.value)} type="date"
                className="flex-1 px-3 py-2 rounded bg-gray-800 border border-green-700 text-white" />
            </div>

            <label className="block text-sm text-gray-300 mb-2">Which column?</label>
            <select value={taskColumn} onChange={(e) => setTaskColumn(e.target.value)} className="w-full mb-3 px-3 py-2 rounded bg-gray-800 border border-green-700 text-white">
              <option value="backlog">Backlog</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <div className="text-xs text-gray-400 mb-2">
              Assigning to: <span className="text-white ml-1">{viewedMemberId || loggedInMemberId || 'unassigned'}</span>
            </div>

            <button onClick={handleSaveTask} className="w-full bg-green-600 hover:bg-green-700 text-black font-bold py-2 rounded mt-2">SAVE TASK</button>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">PROJECT_BOARD</h2>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setOpenOverlay(true)} className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-3 sm:px-4 rounded transition-all">[ + EXECUTE NEW TASK ]</button>
          </div>
        </div>

        {loadError && <LoadError message={loadError} onRetry={loadTasks} />}
        {loading && <p className="text-sm text-gray-400 mb-4">Loading tasks...</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Backlog */}
          <div className="space-y-3">
            <div className="border border-green-900/50 rounded-lg p-3 bg-gray-900/30">
              <h3 className="text-white font-bold">INITIALIZE</h3>
              <p className="text-green-700 text-sm">[Backlog]</p>
            </div>
            <div className="space-y-3">
              {backlog.map((task, idx) => (
                <div key={task.id || idx} className={`border-2 ${borderForColumn('backlog')} ${bgForColumn('backlog')} rounded-lg p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer`}>
                  <p className="text-white text-sm mb-3">{task.title}</p>
                  <span className="text-green-600 text-xs">{task.timeline}</span>
                </div>
              ))}
              {backlog.length === 0 && <div className="text-gray-400">No tasks</div>}
            </div>
          </div>

          {/* In Progress */}
          <div className="space-y-3">
            <div className="border border-green-900/50 rounded-lg p-3 bg-gray-900/30">
              <h3 className="text-white font-bold">RUNNING PROCESSES</h3>
              <p className="text-green-700 text-sm">[In Progress]</p>
            </div>
            <div className="space-y-3">
              {inprogress.map((task, idx) => (
                <div key={task.id || idx} className={`border-2 ${borderForColumn('inprogress')} ${bgForColumn('inprogress')} rounded-lg p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer`}>
                  <p className="text-white text-sm mb-3">{task.title}</p>
                  <span className="text-green-600 text-xs">{task.timeline}</span>
                </div>
              ))}
              {inprogress.length === 0 && <div className="text-gray-400">No tasks</div>}
            </div>
          </div>

          {/* Done */}
          <div className="space-y-3">
            <div className="border border-green-900/50 rounded-lg p-3 bg-gray-900/30">
              <h3 className="text-white font-bold">DEPLOYED</h3>
              <p className="text-green-700 text-sm">[Done]</p>
            </div>
            <div className="space-y-3">
              {done.map((task, idx) => (
                <div key={task.id || idx} className={`border-2 ${borderForColumn('done')} ${bgForColumn('done')} rounded-lg p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer`}>
                  <p className="text-white text-sm mb-3">{task.title}</p>
                  <span className="text-green-600 text-xs">{task.timeline}</span>
                </div>
              ))}
              {done.length === 0 && <div className="text-gray-400">No tasks</div>}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
