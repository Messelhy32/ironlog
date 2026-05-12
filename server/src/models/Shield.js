import mongoose from 'mongoose'

const ShieldGroupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position: { type: Number, required: true },
  name: { type: String, required: true }
}, { timestamps: true, collection: 'shield_groups' })
ShieldGroupSchema.index({ userId: 1, position: 1 })

const ShieldItemSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShieldGroup', required: true },
  position: { type: Number, required: true },
  name: { type: String, required: true },
  detail: { type: String }
}, { timestamps: true, collection: 'shield_items' })
ShieldItemSchema.index({ groupId: 1, position: 1 })

const ShieldLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShieldItem', required: true },
  done: { type: Boolean, default: false },
  ts: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'shield_logs' })
ShieldLogSchema.index({ userId: 1, date: 1, itemId: 1 }, { unique: true })

export const ShieldGroup = mongoose.model('ShieldGroup', ShieldGroupSchema)
export const ShieldItem = mongoose.model('ShieldItem', ShieldItemSchema)
export const ShieldLog = mongoose.model('ShieldLog', ShieldLogSchema)
