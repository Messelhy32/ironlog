import mongoose from 'mongoose'

const AuthTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'auth_tokens' })

// Auto-evict expired tokens.
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const AuthToken = mongoose.model('AuthToken', AuthTokenSchema)
