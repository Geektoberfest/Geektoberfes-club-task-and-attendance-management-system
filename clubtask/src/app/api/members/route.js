import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { requireUser } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const { response } = requireUser(req)
    if (response) return response

    await dbConnect()
    const url = new URL(req.url)
    const domain = url.searchParams.get('domain')
    const q = domain ? { domain } : {}
    const users = await User.find(q).select('name email position domain').lean()
    return new Response(JSON.stringify(users), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
