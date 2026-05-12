import express from 'express'
import { z } from 'zod'
import { Session } from '../models/Session.js'
import { Log } from '../models/Log.js'
import { authMiddleware } from '../auth/middleware.js'
import { broadcast } from '../realtime/broadcast.js'
import { mongoose } from '../db.js'

const router = express.Router()
router.use(authMiddleware)

const dateRe = /^\d{4}-\d{2}-\d{2}$/

const serializeLog = (l) => ({
  id: String(l._id),
  sessionId: String(l.sessionId),
  exerciseName: l.exerciseName,
  done: !!l.done,
  weightKg: l.weightKg ?? null,
  ts: l.ts
})

const buildSessionsWithLogs = async (userId, query) => {
  const sessions = await Session.find({ userId, ...query })
    .sort({ date: -1, createdAt: -1 })
    .lean()
  if (!sessions.length) return []
  const sessionIds = sessions.map(s => s._id)
  const logs = await Log.find({ sessionId: { $in: sessionIds } }).lean()
  const byId = new Map()
  for (const s of sessions) byId.set(String(s._id), { ...s, logs: [] })
  for (const l of logs) {
    const s = byId.get(String(l.sessionId))
    if (s) s.logs.push(l)
  }
  return [...byId.values()].map(s => ({
    id: String(s._id),
    date: s.date,
    dayId: s.dayId,
    createdAt: s.createdAt,
    logs: s.logs.map(serializeLog)
  }))
}

router.get('/', async (req, res) => {
  const date = String(req.query.date || '')
  if (!dateRe.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
  res.json(await buildSessionsWithLogs(req.user._id, { date }))
})

router.get('/history', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)
  const sessions = await Session.find({ userId: req.user._id })
    .sort({ date: -1, createdAt: -1 })
    .skip(offset).limit(limit).lean()
  if (!sessions.length) return res.json([])
  const logs = await Log.find({ sessionId: { $in: sessions.map(s => s._id) } }).lean()
  const logsBySession = new Map()
  for (const l of logs) {
    const arr = logsBySession.get(String(l.sessionId)) || []
    arr.push(serializeLog(l))
    logsBySession.set(String(l.sessionId), arr)
  }
  res.json(sessions.map(s => ({
    id: String(s._id), date: s.date, dayId: s.dayId, createdAt: s.createdAt,
    logs: logsBySession.get(String(s._id)) || []
  })))
})

const DeleteBody = z.object({
  date: z.string().regex(dateRe),
  dayId: z.string().min(1)
})

router.delete('/', async (req, res) => {
  const parsed = DeleteBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const { date, dayId } = parsed.data
  const session = await Session.findOne({ userId: req.user._id, date, dayId }).lean()
  if (!session) {
    // Nothing to reset — that's still a success from the user's perspective.
    return res.json({ removed: 0 })
  }
  const mSession = await mongoose.startSession()
  let removed = 0
  try {
    await mSession.withTransaction(async () => {
      const r = await Log.deleteMany({ sessionId: session._id }, { session: mSession })
      removed = r.deletedCount || 0
      await Session.deleteOne({ _id: session._id }, { session: mSession })
    })
  } finally {
    await mSession.endSession()
  }
  broadcast(req.user._id, 'session:reset', { date, dayId, removed })
  res.json({ removed })
})

export default router
