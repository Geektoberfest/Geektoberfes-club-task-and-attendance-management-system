import dbConnect from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
import { requireUser, requireLead, jsonError, canAccessMember } from '@/lib/authz'
import mongoose from 'mongoose'

// members only see their own attendance rows; leads see every row
function scopeToUser(user, query) {
  return user.role === 'lead' ? query : { ...query, member: user.id }
}

export async function POST(req) {
  try {
    const { user, response } = requireLead(req, 'Only lead can mark attendance')
    if (response) return response

    const body = await req.json()
    const { eventId, memberId, status, attendance } = body

    await dbConnect()

    if (attendance && typeof attendance === 'object') {
      const results = []
      for (const [mId, s] of Object.entries(attendance)) {
        if (!mongoose.Types.ObjectId.isValid(mId)) continue
        const rec = await Attendance.findOneAndUpdate(
          { event: eventId, member: mId },
          { status: s, markedBy: user.id },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
        results.push(rec)
      }
      return new Response(JSON.stringify(results), { status: 200 })
    }

    if (!eventId || !memberId) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })

    const rec = await Attendance.findOneAndUpdate(
      { event: eventId, member: memberId },
      { status: status || 'present', markedBy: user.id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return new Response(JSON.stringify(rec), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}

export async function GET(req) {
  try {
    const { user, response } = requireUser(req)
    if (response) return response

    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')
    const memberId = url.searchParams.get('memberId')

    if (memberId && !canAccessMember(user, memberId)) return jsonError('You can only view your own attendance', 403)

    await dbConnect()

    if (eventId) {
      const data = await Attendance.find(scopeToUser(user, { event: eventId })).populate('member', 'name email domain').lean()
      return new Response(JSON.stringify(data), { status: 200 })
    }
    if (memberId) {
      const data = await Attendance.find(scopeToUser(user, { member: memberId })).populate('event', 'title date time').lean()
      return new Response(JSON.stringify(data), { status: 200 })
    }

    // fallback
    const all = await Attendance.find(scopeToUser(user, {})).populate('member event').lean()
    return new Response(JSON.stringify(all), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
