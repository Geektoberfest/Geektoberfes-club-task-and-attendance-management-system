import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signToken } from '@/lib/auth'
import { requireUser, requireLead, canAccessMember, roleForPosition } from '@/lib/authz'

const requestWith = (headers = {}) => new Request('http://localhost/api/test', { headers })
const bearer = (id, role) => `Bearer ${signToken({ id, email: `${id}@example.com`, role })}`

test('requireUser: missing authorization header is rejected with 401', () => {
  const { response } = requireUser(requestWith())
  assert.equal(response.status, 401)
})

test('requireUser: malformed authorization header is rejected with 401', () => {
  const { response } = requireUser(requestWith({ authorization: 'Token abc' }))
  assert.equal(response.status, 401)
})

test('requireUser: invalid token is rejected with 401', () => {
  const { response } = requireUser(requestWith({ authorization: 'Bearer not-a-real-token' }))
  assert.equal(response.status, 401)
})

test('requireUser: valid token returns the token payload', () => {
  const { user, response } = requireUser(requestWith({ authorization: bearer('m1', 'member') }))
  assert.equal(response, undefined)
  assert.equal(user.id, 'm1')
  assert.equal(user.role, 'member')
})

test('requireLead: no token is 401, not 403', () => {
  const { response } = requireLead(requestWith())
  assert.equal(response.status, 401)
})

test('requireLead: member is forbidden with 403', async () => {
  const { response } = requireLead(requestWith({ authorization: bearer('m1', 'member') }), 'Only lead')
  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), { error: 'Only lead' })
})

test('requireLead: lead is allowed through', () => {
  const { user, response } = requireLead(requestWith({ authorization: bearer('l1', 'lead') }))
  assert.equal(response, undefined)
  assert.equal(user.role, 'lead')
})

test('canAccessMember: member can access their own record', () => {
  assert.equal(canAccessMember({ id: 'm1', role: 'member' }, 'm1'), true)
})

test('canAccessMember: member cannot access another member record', () => {
  assert.equal(canAccessMember({ id: 'm1', role: 'member' }, 'm2'), false)
})

test('canAccessMember: lead can access any member record', () => {
  assert.equal(canAccessMember({ id: 'l1', role: 'lead' }, 'm2'), true)
})

test('roleForPosition: lead positions map to the lead role', () => {
  assert.equal(roleForPosition('Lead'), 'lead')
  assert.equal(roleForPosition('Team Lead'), 'lead')
  assert.equal(roleForPosition('lead'), 'lead')
})

test('roleForPosition: other positions map to the member role', () => {
  assert.equal(roleForPosition('Member'), 'member')
  assert.equal(roleForPosition('President'), 'member')
  assert.equal(roleForPosition('Vice-President'), 'member')
  assert.equal(roleForPosition(''), 'member')
})
