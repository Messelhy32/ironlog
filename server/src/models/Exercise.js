import mongoose from 'mongoose'

const ExerciseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  position: { type: Number, required: true },
  name: { type: String, required: true },
  detail: { type: String },
  weighted: { type: Boolean, default: false }
}, { timestamps: true, collection: 'exercises' })

ExerciseSchema.index({ groupId: 1, position: 1 })
ExerciseSchema.index({ name: 1 })

export const Exercise = mongoose.model('Exercise', ExerciseSchema)
