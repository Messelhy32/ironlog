import mongoose from 'mongoose'

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },   // 'YYYY-MM-DD'
  dayId: { type: String, required: true }   // soft ref to Day._id (so legacy ids survive)
}, { timestamps: true, collection: 'sessions' })

SessionSchema.index({ userId: 1, date: 1, dayId: 1 }, { unique: true })
SessionSchema.index({ userId: 1, date: -1 })

export const Session = mongoose.model('Session', SessionSchema)
