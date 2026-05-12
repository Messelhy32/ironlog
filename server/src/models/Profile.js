import mongoose from 'mongoose'

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  units: { type: String, enum: ['kg', 'lb'], default: 'kg' },
  activeProgramId: { type: String, default: null },
  selectedDayId: { type: String, default: null }
}, { timestamps: true, collection: 'profiles' })

export const Profile = mongoose.model('Profile', ProfileSchema)
