import AuditLog from '@/models/AuditLog'

// Keys that must never be written to the audit log, at any depth.
const SENSITIVE_KEY = /password|passwordhash|token|jwt|secret|authorization/i

export function sanitizeDetails(value, depth = 0) {
  if (depth > 5 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(v => sanitizeDetails(v, depth + 1))

  const clean = {}
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) continue
    clean[key] = sanitizeDetails(val, depth + 1)
  }
  return clean
}

// `actor` must be the verified token payload from requireUser/requireLead, never a request field.
// Call this BEFORE the change it describes. If it throws, the caller must not make the change.
export async function recordAudit(actor, { action, resourceType, resourceId = '', details = {} }) {
  await AuditLog.create({
    actor: actor.id,
    actorRole: actor.role,
    action,
    resourceType,
    resourceId: String(resourceId || ''),
    details: sanitizeDetails(details)
  })
}

// Response sent when the audit write fails. The change was not made.
export function auditUnavailable() {
  return new Response(JSON.stringify({ error: 'Audit log unavailable. The change was not saved, please retry.' }), { status: 503 })
}
