import { AuthToken } from '../models/AuthToken.js'
import { User } from '../models/User.js'

export const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return res.status(401).json({ error: 'missing token' })

  const tokenRow = await AuthToken.findOne({ token: m[1] }).lean()
  if (!tokenRow) return res.status(401).json({ error: 'invalid token' })
  if (tokenRow.expiresAt && tokenRow.expiresAt.getTime() < Date.now()) {
    return res.status(401).json({ error: 'expired' })
  }

  const user = await User.findById(tokenRow.userId).lean()
  if (!user) return res.status(401).json({ error: 'user gone' })

  req.user = user
  req.token = tokenRow.token

  // Update lastSeen async — fire & forget.
  AuthToken.updateOne({ token: tokenRow.token }, { $set: { lastSeen: new Date() } })
    .catch(() => {})

  next()
}
