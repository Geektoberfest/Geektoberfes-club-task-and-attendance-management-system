import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { isLeadPosition, roleForPosition, jsonError } from '@/lib/authz'

export async function POST(req) {
  try {
    console.log('[SIGNUP] request at', new Date().toISOString())
    const body = await req.json().catch(e => {
      console.error('[SIGNUP] failed to parse JSON body', e)
      return null
    })
    if (!body) return new Response(JSON.stringify({ error: 'Invalid or empty JSON body' }), { status: 400 })

    const name = (body.name || '').toString().trim()
    const email = (body.email || '').toString().trim().toLowerCase()
    const password = (body.password || '').toString()
    const position = (body.position || '').toString()
    const domain = (body.domain || '').toString()

    if (!name || !email || !password) {
      console.warn('[SIGNUP] missing fields', { name: !!name, email: !!email, password: !!password })
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
    }

    // lead status is granted by an existing lead, never chosen at signup
    if (isLeadPosition(position)) return jsonError('Lead positions cannot be selected at signup', 403)

    await dbConnect()

    // check existing
    const existing = await User.findOne({ email })
    if (existing) {
      console.warn('[SIGNUP] email already used', email)
      return new Response(JSON.stringify({ error: 'Email already used' }), { status: 409 })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = new User({ name, email, passwordHash, position, domain, memberSince: new Date().getFullYear() })
    await user.save()

    const role = roleForPosition(user.position)
    const token = signToken({ id: user._id, email: user.email, role })

    const userResp = { id: user._id, name: user.name, email: user.email, position: user.position, domain: user.domain }
    console.log('[SIGNUP] created user', email, 'role:', role)
    return new Response(JSON.stringify({ user: userResp, token }), { status: 201 })
  } catch (err) {
    console.error('[SIGNUP] unexpected error', err && err.stack ? err.stack : err)

    if (err && err.code === 11000) {
      return new Response(JSON.stringify({ error: 'Duplicate key error' }), { status: 409 })
    }
    return new Response(JSON.stringify({ error: 'Server error', details: String(err && err.message ? err.message : err) }), { status: 500 })
  }
}
