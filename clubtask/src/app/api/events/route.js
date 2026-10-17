import dbConnect from '@/lib/mongodb'
import Event from '@/models/Event'
import { requireUser, requireLead } from '@/lib/authz'

export async function GET(req) {
  try {
    const { response } = requireUser(req)
    if (response) return response

    await dbConnect()
    const events = await Event.find({}).sort({ createdAt: -1 }).lean()
    return new Response(JSON.stringify(events), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { user, response } = requireLead(req, 'Only lead can create events')
    if (response) return response

    await dbConnect()
    const data = await req.json()
    const ev = new Event({ ...data, createdBy: user.id })
    await ev.save()
    return new Response(JSON.stringify(ev), { status: 201 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { response } = requireLead(req, 'Only lead can delete events')
    if (response) return response

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })

    await dbConnect()
    await Event.findByIdAndDelete(id)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
