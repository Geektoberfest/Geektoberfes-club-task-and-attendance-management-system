import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import { requireUser, jsonError, canAccessMember } from '@/lib/authz'
import { recordAudit, auditUnavailable } from '@/lib/audit'
import mongoose from 'mongoose'

const ALLOWED_COLUMNS = ['backlog', 'inprogress', 'done']

// Moves a task to another column. Leads can move any task; members only their own.
export async function PATCH(req, { params }) {
  try {
    const { user, response } = requireUser(req)
    if (response) return response

    const { id } = params
    if (!mongoose.Types.ObjectId.isValid(id)) return jsonError('Invalid id', 400)

    const body = await req.json().catch(() => null)
    const columnId = body?.columnId
    if (!ALLOWED_COLUMNS.includes(columnId)) return jsonError('columnId must be backlog, inprogress, or done', 400)

    await dbConnect()
    const task = await Task.findById(id).lean()
    if (!task) return jsonError('Task not found', 404)
    if (!canAccessMember(user, task.assignee)) return jsonError('You can only move your own tasks', 403)

    const from = task.columnId
    try {
      await recordAudit(user, { action: 'task.update', resourceType: 'task', resourceId: id, details: { title: task.title, from, to: columnId } })
    } catch (err) {
      console.error('[AUDIT] task.update not recorded', err)
      return auditUnavailable()
    }

    const updated = await Task.findByIdAndUpdate(id, { columnId }, { new: true }).lean()
    return new Response(JSON.stringify({ ok: true, task: updated }), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
