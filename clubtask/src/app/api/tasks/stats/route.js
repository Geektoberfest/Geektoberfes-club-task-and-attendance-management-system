import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import { getUserFromReq } from '@/lib/getUserFromReq'

// column ids match the board: backlog = pending, inprogress = in progress, done = completed
const STATUS_COLUMNS = {
  pending: ['backlog', 'INITIALIZE'],
  inProgress: ['inprogress', 'RUNNING PROCESSES'],
  completed: ['done', 'DEPLOYED']
}

export async function GET(req) {
  try {
    const { payload, error } = getUserFromReq(req)
    if (error) return new Response(JSON.stringify({ error }), { status: 401 })
    if (payload.role !== 'lead') return new Response(JSON.stringify({ error: 'Only lead can view task statistics' }), { status: 403 })

    await dbConnect()
    const [pending, inProgress, completed, total] = await Promise.all([
      Task.countDocuments({ columnId: { $in: STATUS_COLUMNS.pending } }),
      Task.countDocuments({ columnId: { $in: STATUS_COLUMNS.inProgress } }),
      Task.countDocuments({ columnId: { $in: STATUS_COLUMNS.completed } }),
      Task.countDocuments({})
    ])

    return new Response(JSON.stringify({ pending, inProgress, completed, total }), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
