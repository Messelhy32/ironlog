import mongoose from 'mongoose'

const DaySchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  position: { type: Number, required: true },
  label: { type: String, required: true },
  title: { type: String, required: true },
  emoji: { type: String },
  accent: { type: String }
}, { timestamps: true, collection: 'day' })

DaySchema.index({ programId: 1, position: 1 })

export const Day = mongoose.model('Day', DaySchema)
