import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signToken } from '@/lib/auth'
import { sanitizeDetails } from '@/lib/audit'
import AuditLog from '@/models/AuditLog'
import * as auditRoute from '@/app/api/audit-logs/route'

const authHeader = (id, role) => ({ authorization: `Bearer ${signToken({ id, email: `${id}@example.com`, role })}` })
const request = (url, { method = 'GET', headers = {} } = {}) => new Request(`http://localhost${url}`, { method, headers })

test('sanitizeDetails removes password, token, and secret fields at any depth', () => {
  const clean = sanitizeDetails({
    title: 'Hall booking',
    password: 'Test@1234',
    passwordHash: '$2a$10$abc',
    nested: { token: 'jwt-value', keep: 'yes', deeper: { authorization: 'Bearer x', JWT_SECRET: 's' } },
    list: [{ secret: 'x', name: 'ok' }]
  })
  assert.deepEqual(clean, {
    title: 'Hall booking',
    nested: { keep: 'yes', deeper: {} },
    list: [{ name: 'ok' }]
  })
})

test('sanitizeDetails keeps normal values and leaves primitives alone', () => {
  assert.equal(sanitizeDetails('plain'), 'plain')
  assert.equal(sanitizeDetails(42), 42)
  assert.equal(sanitizeDetails(null), null)
  assert.deepEqual(sanitizeDetails({ status: 'present', eventId: 'e1' }), { status: 'present', eventId: 'e1' })
})

test('audit entries cannot be updated through Mongoose', async () => {
  await assert.rejects(AuditLog.updateOne({}, { action: 'forged' }), /cannot be modified or deleted/)
  await assert.rejects(AuditLog.findOneAndUpdate({}, { action: 'forged' }), /cannot be modified or deleted/)
})

test('audit entries cannot be deleted through Mongoose', async () => {
  await assert.rejects(AuditLog.deleteOne({}), /cannot be modified or deleted/)
  await assert.rejects(AuditLog.findByIdAndDelete('6ad2e942d7e87c69cf14f8c5'), /cannot be modified or deleted/)
})

test('audit log read: no token is 401', async () => {
  const res = await auditRoute.GET(request('/api/audit-logs'))
  assert.equal(res.status, 401)
})

test('audit log read: member is forbidden with 403', async () => {
  const res = await auditRoute.GET(request('/api/audit-logs', { headers: authHeader('m1', 'member') }))
  assert.equal(res.status, 403)
})

test('audit log is read-only: write methods are not exported', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(typeof auditRoute[method], 'undefined', `${method} must not be exported`)
  }
})
