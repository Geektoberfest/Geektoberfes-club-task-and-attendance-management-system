import dbConnect from '@/lib/mongodb'
import Event from '@/models/Event'
import { requireUser, requireLead } from '@/lib/authz'
import { recordAudit, auditUnavailable } from '@/lib/audit'
import mongoose from 'mongoose'

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
    const ev = new Event({ ...data, _id: new mongoose.Types.ObjectId(), createdBy: user.id })

    // audit first: if the write fails, the event is not created
    try {
      await recordAudit(user, { action: 'event.create', resourceType: 'event', resourceId: ev._id, details: { title: ev.title, date: ev.date } })
    } catch (err) {
      console.error('[AUDIT] event.create not recorded', err)
      return auditUnavailable()
    }

    await ev.save()
    return new Response(JSON.stringify(ev), { status: 201 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { user, response } = requireLead(req, 'Only lead can delete events')
    if (response) return response

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 })
    if (!mongoose.Types.ObjectId.isValid(id)) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 })

    await dbConnect()
    const existing = await Event.findById(id).lean()
    if (!existing) return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 })

    try {
      await recordAudit(user, { action: 'event.delete', resourceType: 'event', resourceId: id, details: { title: existing.title, date: existing.date } })
    } catch (err) {
      console.error('[AUDIT] event.delete not recorded', err)
      return auditUnavailable()
    }

    await Event.findByIdAndDelete(id)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
