import dbConnect from '@/lib/mongodb'
import Task from '@/models/Task'
import { verifyToken } from '@/lib/auth'

export async function GET(req) {
  try {
    await dbConnect()
    const url = new URL(req.url)
    const assignee = url.searchParams.get('assignee')
    let query = {}
    if (assignee) query.assignee = assignee
    const tasks = await Task.find(query).sort({ createdAt: -1 }).lean()
    return new Response(JSON.stringify(tasks), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    await dbConnect()
    const bearer = req.headers.get('authorization') || ''
    const token = bearer.split(' ')[1]
    const user = verifyToken(token)
    if (!user) return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401 })

    const body = await req.json()
    const task = new Task({
      title: body.title,
      timeline: body.timeline,
      columnId: body.columnId || 'backlog',
      priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
      assignee: body.assignee || user.id,
      createdAt: new Date()
    })
    await task.save()
    return new Response(JSON.stringify({ ok: true, task }), { status: 201 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
