// These tests only cover requests that stop at the authorization checks, so no database is needed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signToken } from '@/lib/auth'
import * as eventsRoute from '@/app/api/events/route'
import * as tasksRoute from '@/app/api/tasks/route'
import * as membersRoute from '@/app/api/members/route'
import * as attendanceRoute from '@/app/api/attendance/route'
import * as signupRoute from '@/app/api/auth/signup/route'

const OTHER_MEMBER = 'member-2'
const ME = 'member-1'

const authHeader = (id, role) => ({ authorization: `Bearer ${signToken({ id, email: `${id}@example.com`, role })}` })

const request = (url, { method = 'GET', headers = {}, body } = {}) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

const member = authHeader(ME, 'member')

test('unauthenticated requests are rejected with 401', async (t) => {
  const cases = [
    ['GET events', () => eventsRoute.GET(request('/api/events'))],
    ['POST events', () => eventsRoute.POST(request('/api/events', { method: 'POST', body: { title: 'x' } }))],
    ['DELETE events', () => eventsRoute.DELETE(request('/api/events?id=abc', { method: 'DELETE' }))],
    ['GET members', () => membersRoute.GET(request('/api/members'))],
    ['GET tasks', () => tasksRoute.GET(request('/api/tasks'))],
    ['POST tasks', () => tasksRoute.POST(request('/api/tasks', { method: 'POST', body: { title: 'x' } }))],
    ['GET attendance', () => attendanceRoute.GET(request('/api/attendance'))],
    ['POST attendance', () => attendanceRoute.POST(request('/api/attendance', { method: 'POST', body: {} }))]
  ]
  for (const [name, call] of cases) {
    await t.test(name, async () => {
      const res = await call()
      assert.equal(res.status, 401)
    })
  }
})

test('members cannot create or delete events (403)', async (t) => {
  await t.test('POST events', async () => {
    const res = await eventsRoute.POST(request('/api/events', { method: 'POST', headers: member, body: { title: 'x' } }))
    assert.equal(res.status, 403)
  })
  await t.test('DELETE events', async () => {
    const res = await eventsRoute.DELETE(request('/api/events?id=abc', { method: 'DELETE', headers: member }))
    assert.equal(res.status, 403)
  })
})

test('lead delete without an id passes authorization and is rejected as 400', async () => {
  const res = await eventsRoute.DELETE(request('/api/events', { method: 'DELETE', headers: authHeader('lead-1', 'lead') }))
  assert.equal(res.status, 400)
})

test('members cannot read another member\'s tasks (403)', async () => {
  const res = await tasksRoute.GET(request(`/api/tasks?assignee=${OTHER_MEMBER}`, { headers: member }))
  assert.equal(res.status, 403)
})

test('members cannot create a task assigned to someone else (403)', async () => {
  const res = await tasksRoute.POST(request('/api/tasks', {
    method: 'POST',
    headers: member,
    body: { title: 'x', assignee: OTHER_MEMBER }
  }))
  assert.equal(res.status, 403)
})

test('members cannot mark attendance (403)', async () => {
  const res = await attendanceRoute.POST(request('/api/attendance', {
    method: 'POST',
    headers: member,
    body: { eventId: 'e1', memberId: ME }
  }))
  assert.equal(res.status, 403)
})

test('members cannot read another member\'s attendance (403)', async () => {
  const res = await attendanceRoute.GET(request(`/api/attendance?memberId=${OTHER_MEMBER}`, { headers: member }))
  assert.equal(res.status, 403)
})

test('signup cannot grant a lead position (403)', async () => {
  const res = await signupRoute.POST(request('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Eve', email: 'eve@example.com', password: 'Test@1234', position: 'Lead' }
  }))
  assert.equal(res.status, 403)
})

test('signup cannot grant a lead position in any casing (403)', async () => {
  const res = await signupRoute.POST(request('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Eve', email: 'eve@example.com', password: 'Test@1234', position: 'Team LEAD' }
  }))
  assert.equal(res.status, 403)
})
