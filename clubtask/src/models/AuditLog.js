import mongoose from 'mongoose'

const AuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, enum: ['lead', 'member'], required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, default: '' },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, immutable: true }
})

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })
AuditLogSchema.index({ actor: 1, createdAt: -1 })

// Audit entries are append-only. Block every update and delete path in Mongoose.
const blockChange = function () {
  throw new Error('Audit log entries cannot be modified or deleted')
}
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete', 'findByIdAndUpdate']) {
  AuditLogSchema.pre(hook, blockChange)
}
AuditLogSchema.pre('save', function () {
  if (!this.isNew) throw new Error('Audit log entries cannot be modified or deleted')
})

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
