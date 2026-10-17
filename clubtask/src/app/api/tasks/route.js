import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import { requireUser, jsonError, canAccessMember } from '@/lib/authz'

export async function GET(req) {
  try {
    const { user, response } = requireUser(req)
    if (response) return response

    const url = new URL(req.url)
    const assignee = url.searchParams.get('assignee')
    if (assignee && !canAccessMember(user, assignee)) return jsonError('You can only view your own tasks', 403)

    await dbConnect()
    // leads see every task; members only ever see their own
    let query = {}
    if (user.role !== 'lead') query.assignee = user.id
    else if (assignee) query.assignee = assignee
    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean()
    return new Response(JSON.stringify(tasks), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { user, response } = requireUser(req)
    if (response) return response

    const body = await req.json()
    const assignee = body.assignee || user.id
    if (!canAccessMember(user, assignee)) return jsonError('You can only create tasks for yourself', 403)

    await dbConnect()
    const task = new Task({
      title: body.title,
      timeline: body.timeline,
      columnId: body.columnId || 'backlog',
      assignee,
      createdAt: new Date()
    })
    await task.save()
    return new Response(JSON.stringify({ ok: true, task }), { status: 201 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
