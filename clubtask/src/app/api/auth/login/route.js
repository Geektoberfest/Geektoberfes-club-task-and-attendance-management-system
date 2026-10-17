import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { roleForPosition } from '@/lib/authz'
import { recordAudit, auditUnavailable } from '@/lib/audit'

export async function POST(req) {
  try {
    console.log('[LOGIN] request received at', new Date().toISOString())
    await dbConnect()
    const body = await req.json().catch(e => {
      console.error('[LOGIN] failed to parse JSON body', e)
      return null
    })
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid or empty JSON body' }), { status: 400 })
    }

    // accept either email or username
    const email = (body.email || body.username || '').toString().trim().toLowerCase()
    const password = (body.password || '').toString()

    if (!email || !password) {
      console.warn('[LOGIN] missing credentials', { emailProvided: !!body.email, usernameProvided: !!body.username })
      return new Response(JSON.stringify({ error: 'email and password required' }), { status: 400 })
    }

    // find user by email
    const user = await User.findOne({ email })
    if (!user) {
      console.warn('[LOGIN] no user found with email', email)
      return new Response(JSON.stringify({ error: 'No such email exists.Please register below.' }), { status: 401 })
    }

    // check password field name
    const storedPassword = user.passwordHash || user.password || ''
    const match = await bcrypt.compare(password, storedPassword)
    if (!match) {
      console.warn('[LOGIN] password mismatch for', email)
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    }

    const role = roleForPosition(user.position)

    try {
      await recordAudit({ id: user._id, role }, { action: 'user.login', resourceType: 'user', resourceId: user._id, details: { position: user.position } })
    } catch (err) {
      console.error('[AUDIT] user.login not recorded', err)
      return auditUnavailable()
    }

    const token = signToken({ id: user._id, email: user.email, role })

    const userResp = {
      id: user._id,
      name: user.name,
      email: user.email,
      position: user.position,
      domain: user.domain
    }

    console.log('[LOGIN] success for', email, 'role:', role)
    return new Response(JSON.stringify({ user: userResp, token }), { status: 200 })
  } catch (err) {
    console.error('[LOGIN] unexpected error', err && err.stack ? err.stack : err)
    return new Response(JSON.stringify({ error: 'Server error', details: String(err && err.message ? err.message : err) }), { status: 500 })
  }
}
