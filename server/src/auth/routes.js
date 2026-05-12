import crypto from 'node:crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../env.js'
import { User } from '../models/User.js'
import { Profile } from '../models/Profile.js'
import { AuthToken } from '../models/AuthToken.js'
import { authMiddleware } from './middleware.js'
import { hashPassword, verifyPassword } from './password.js'

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
})

const LoginBody = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(200)
})

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = LoginBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })

  const { username, password } = parsed.data
  const user = await User.findOne({ username }).lean()
  if (!user) return res.status(401).json({ error: 'invalid credentials' })

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'invalid credentials' })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + env.TOKEN_TTL_DAYS * 86400_000)
  await AuthToken.create({ token, userId: user._id, expiresAt })

  res.json({
    token,
    expiresAt,
    user: { id: user._id, username: user.username, displayName: user.displayName || null }
  })
})

router.post('/logout', authMiddleware, async (req, res) => {
  await AuthToken.deleteOne({ token: req.token })
  res.status(204).end()
})

router.get('/me', authMiddleware, async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id }).lean()
  res.json({
    user: { id: req.user._id, username: req.user.username, displayName: req.user.displayName || null },
    profile: profile ? {
      theme: profile.theme,
      units: profile.units,
      activeProgramId: profile.activeProgramId || null,
      selectedDayId: profile.selectedDayId || null
    } : null
  })
})

const ProfilePatch = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  units: z.enum(['kg', 'lb']).optional(),
  activeProgramId: z.string().nullable().optional(),
  selectedDayId: z.string().nullable().optional()
}).strict()

router.patch('/me/profile', authMiddleware, async (req, res) => {
  const parsed = ProfilePatch.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const updated = await Profile.findOneAndUpdate(
    { userId: req.user._id },
    { $set: parsed.data },
    { new: true, upsert: true }
  ).lean()
  res.json({
    theme: updated.theme,
    units: updated.units,
    activeProgramId: updated.activeProgramId || null,
    selectedDayId: updated.selectedDayId || null
  })
})

const PasswordPatch = z.object({
  current: z.string().min(1),
  next: z.string().min(4).max(200)
})

router.patch('/me/password', authMiddleware, async (req, res) => {
  const parsed = PasswordPatch.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const full = await User.findById(req.user._id)
  const ok = await verifyPassword(parsed.data.current, full.passwordHash)
  if (!ok) return res.status(401).json({ error: 'wrong password' })
  full.passwordHash = await hashPassword(parsed.data.next)
  await full.save()
  // Invalidate all other tokens, keep this one.
  await AuthToken.deleteMany({ userId: req.user._id, token: { $ne: req.token } })
  res.status(204).end()
})

export default router
