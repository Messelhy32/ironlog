import mongoose from 'mongoose'

const GroupSchema = new mongoose.Schema({
  dayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Day', required: true },
  position: { type: Number, required: true },
  name: { type: String, required: true }
}, { timestamps: true, collection: 'groups' })

GroupSchema.index({ dayId: 1, position: 1 })

export const Group = mongoose.model('Group', GroupSchema)
