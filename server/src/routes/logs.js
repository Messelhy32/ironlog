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

const UpsertBody = z.object({
  date: z.string().regex(dateRe),
  dayId: z.string().min(1),
  exerciseName: z.string().min(1).max(120),
  done: z.boolean(),
  weightKg: z.number().nonnegative().nullable().optional()
})

const findPRKg = async (userId, exerciseName) => {
  const [top] = await Log.aggregate([
    { $match: { userId, exerciseName, done: true, weightKg: { $ne: null } } },
    { $group: { _id: null, prKg: { $max: '$weightKg' } } }
  ])
  return top?.prKg ?? null
}

router.put('/', async (req, res) => {
  const parsed = UpsertBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const { date, dayId, exerciseName, done } = parsed.data
  const weightKg = parsed.data.weightKg === undefined ? null : parsed.data.weightKg

  const mSession = await mongoose.startSession()
  let resultLog
  try {
    await mSession.withTransaction(async () => {
      // Upsert the session (per userId × date × dayId).
      let sess = await Session.findOne({ userId: req.user._id, date, dayId }).session(mSession)
      if (!sess) {
        sess = await Session.create([{ userId: req.user._id, date, dayId }], { session: mSession })
        sess = sess[0]
      }
      // Upsert the log under it.
      const now = new Date()
      resultLog = await Log.findOneAndUpdate(
        { sessionId: sess._id, exerciseName },
        {
          $set: { done, weightKg, ts: now, updatedAt: now },
          $setOnInsert: { userId: req.user._id }
        },
        { new: true, upsert: true, session: mSession }
      )
    })
  } finally {
    await mSession.endSession()
  }

  const prKg = await findPRKg(req.user._id, exerciseName)

  const log = {
    id: String(resultLog._id),
    sessionId: String(resultLog.sessionId),
    exerciseName: resultLog.exerciseName,
    done: !!resultLog.done,
    weightKg: resultLog.weightKg ?? null,
    ts: resultLog.ts
  }
  broadcast(req.user._id, 'log:upserted', { date, dayId, log, prKg })
  res.json({ log, prKg, date, dayId })
})

const DeleteBody = z.object({
  date: z.string().regex(dateRe),
  dayId: z.string().min(1),
  exerciseName: z.string().min(1).max(120)
})

router.delete('/', async (req, res) => {
  const parsed = DeleteBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const { date, dayId, exerciseName } = parsed.data
  const sess = await Session.findOne({ userId: req.user._id, date, dayId }).lean()
  if (!sess) return res.json({ removed: 0 })
  const r = await Log.deleteOne({ sessionId: sess._id, exerciseName })
  broadcast(req.user._id, 'log:deleted', { date, dayId, exerciseName })
  res.json({ removed: r.deletedCount || 0 })
})

export default router
