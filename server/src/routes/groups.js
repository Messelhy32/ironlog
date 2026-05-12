import express from 'express'
import { z } from 'zod'
import { Group } from '../models/Group.js'
import { Day } from '../models/Day.js'
import { Program } from '../models/Program.js'
import { Exercise } from '../models/Exercise.js'
import { authMiddleware } from '../auth/middleware.js'
import { broadcast } from '../realtime/broadcast.js'

const router = express.Router()
router.use(authMiddleware)

/** Throws 404 if the day doesn't belong to req.user. */
const assertDayOwnership = async (userId, dayId) => {
  const day = await Day.findById(dayId).lean()
  if (!day) return null
  const program = await Program.findOne({ _id: day.programId, userId }).lean()
  if (!program) return null
  return day
}

const CreateBody = z.object({
  dayId: z.string().min(1),
  name: z.string().min(1).max(80),
  position: z.number().int().nonnegative().optional()
})

router.post('/', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const day = await assertDayOwnership(req.user._id, parsed.data.dayId)
  if (!day) return res.status(404).json({ error: 'day not found' })

  const last = await Group.findOne({ dayId: day._id }).sort({ position: -1 }).lean()
  const position = parsed.data.position ?? ((last?.position ?? -1) + 1)
  const group = await Group.create({ dayId: day._id, name: parsed.data.name, position })
  const out = {
    id: String(group._id), dayId: String(day._id),
    name: group.name, position: group.position, exercises: []
  }
  broadcast(req.user._id, 'group:created', { dayId: String(day._id), group: out })
  res.status(201).json(out)
})

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  position: z.number().int().nonnegative().optional()
}).strict()

router.patch('/:id', async (req, res) => {
  const parsed = PatchBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const group = await Group.findById(req.params.id).lean()
  if (!group) return res.status(404).json({ error: 'not found' })
  if (!(await assertDayOwnership(req.user._id, group.dayId))) {
    return res.status(404).json({ error: 'not found' })
  }
  const updated = await Group.findByIdAndUpdate(
    req.params.id, { $set: parsed.data }, { new: true }
  ).lean()
  const out = { id: String(updated._id), dayId: String(updated.dayId), name: updated.name, position: updated.position }
  broadcast(req.user._id, 'group:updated', out)
  res.json(out)
})

router.delete('/:id', async (req, res) => {
  const group = await Group.findById(req.params.id).lean()
  if (!group) return res.status(404).json({ error: 'not found' })
  if (!(await assertDayOwnership(req.user._id, group.dayId))) {
    return res.status(404).json({ error: 'not found' })
  }
  await Exercise.deleteMany({ groupId: group._id })
  await Group.deleteOne({ _id: group._id })
  broadcast(req.user._id, 'group:deleted', { id: String(group._id), dayId: String(group.dayId) })
  res.status(204).end()
})

export default router
