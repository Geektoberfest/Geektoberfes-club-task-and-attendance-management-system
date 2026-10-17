import dbConnect from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'
import { requireLead, jsonError } from '@/lib/authz'
import mongoose from 'mongoose'

const MAX_LIMIT = 100

export const dynamic = 'force-dynamic'

// Read-only. Only GET is exported, so POST, PUT, PATCH, and DELETE return 405.
export async function GET(req) {
  try {
    const { response } = requireLead(req, 'Only lead can view the audit log')
    if (response) return response

    const url = new URL(req.url)
    const query = {}

    const action = url.searchParams.get('action')
    if (action) query.action = action

    const resourceType = url.searchParams.get('resourceType')
    if (resourceType) query.resourceType = resourceType

    const actor = url.searchParams.get('actor')
    if (actor) {
      if (!mongoose.Types.ObjectId.isValid(actor)) return jsonError('Invalid actor id', 400)
      query.actor = actor
    }

    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (from || to) {
      query.createdAt = {}
      if (from) {
        const d = new Date(from)
        if (Number.isNaN(d.getTime())) return jsonError('Invalid from date', 400)
        query.createdAt.$gte = d
      }
      if (to) {
        const d = new Date(to)
        if (Number.isNaN(d.getTime())) return jsonError('Invalid to date', 400)
        query.createdAt.$lte = d
      }
    }

    const requestedLimit = parseInt(url.searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(requestedLimit || 50, 1), MAX_LIMIT)
    const skip = Math.max(parseInt(url.searchParams.get('skip') || '0', 10) || 0, 0)

    await dbConnect()
    const [entries, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name email').lean(),
      AuditLog.countDocuments(query)
    ])

    return new Response(JSON.stringify({ total, limit, skip, entries }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
