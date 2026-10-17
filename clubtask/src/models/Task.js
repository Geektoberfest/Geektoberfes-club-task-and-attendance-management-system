import mongoose from 'mongoose'

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  timeline: { type: String, default: '' },
  columnId: { type: String, default: 'backlog' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  color: { type: String, default: '' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  meta: { type: Object, default: {} }
}, { timestamps: true })

export default mongoose.models.Task || mongoose.model('Task', TaskSchema)
