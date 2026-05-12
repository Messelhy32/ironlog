import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String }
}, { timestamps: true, collection: 'users' })

export const User = mongoose.model('User', UserSchema)
