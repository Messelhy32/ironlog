import mongoose from 'mongoose'

const ProgramSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  position: { type: Number, default: 0 }
}, { timestamps: true, collection: 'programs' })

ProgramSchema.index({ userId: 1, position: 1 })

export const Program = mongoose.model('Program', ProgramSchema)
