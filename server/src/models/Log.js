import mongoose from 'mongoose'

const LogSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  // Denormalized for fast per-user PR queries without a join.
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exerciseName: { type: String, required: true },
  done: { type: Boolean, default: false },
  weightKg: { type: Number, default: null },
  ts: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'logs' })

LogSchema.index({ sessionId: 1, exerciseName: 1 }, { unique: true })
// PR lookup: filter by user + exercise, sort by weight desc.
LogSchema.index({ userId: 1, exerciseName: 1, weightKg: -1 })

export const Log = mongoose.model('Log', LogSchema)
