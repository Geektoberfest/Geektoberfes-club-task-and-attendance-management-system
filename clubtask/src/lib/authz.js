import { getUserFromReq } from '@/lib/getUserFromReq'

// Lead status comes from the position text. Login and signup both use this rule.
export function isLeadPosition(position = '') {
  return position.toString().toLowerCase().includes('lead')
}

export function roleForPosition(position) {
  return isLeadPosition(position) ? 'lead' : 'member'
}

export function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), { status })
}

// Returns { user } for a valid token, or { response } to send back as-is.
export function requireUser(req) {
  const { payload, error } = getUserFromReq(req)
  if (error) return { response: jsonError(error, 401) }
  return { user: payload }
}

export function requireLead(req, message = 'Only lead can perform this action') {
  const result = requireUser(req)
  if (result.response) return result
  if (result.user.role !== 'lead') return { response: jsonError(message, 403) }
  return result
}

// Leads can act on any member's records. Members only on their own.
export function canAccessMember(user, memberId) {
  return user.role === 'lead' || String(user.id) === String(memberId)
}
