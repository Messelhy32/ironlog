import express from 'express'
import { z } from 'zod'
import { Exercise } from '../models/Exercise.js'
import { Group } from '../models/Group.js'
import { Day } from '../models/Day.js'
import { Program } from '../models/Program.js'
import { authMiddleware } from '../auth/middleware.js'
import { broadcast } from '../realtime/broadcast.js'

const router = express.Router()
router.use(authMiddleware)

const assertGroupOwnership = async (userId, groupId) => {
  const group = await Group.findById(groupId).lean()
  if (!group) return null
  const day = await Day.findById(group.dayId).lean()
  if (!day) return null
  const program = await Program.findOne({ _id: day.programId, userId }).lean()
  if (!program) return null
  return group
}

const serialize = (ex) => ({
  id: String(ex._id), groupId: String(ex.groupId),
  name: ex.name, detail: ex.detail || '', weighted: !!ex.weighted, position: ex.position
})

const CreateBody = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(120),
  detail: z.string().max(120).optional().default(''),
  weighted: z.boolean().optional().default(false),
  position: z.number().int().nonnegative().optional()
})

router.post('/', async (req, res) => {
  const parsed = CreateBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const group = await assertGroupOwnership(req.user._id, parsed.data.groupId)
  if (!group) return res.status(404).json({ error: 'group not found' })

  const last = await Exercise.findOne({ groupId: group._id }).sort({ position: -1 }).lean()
  const position = parsed.data.position ?? ((last?.position ?? -1) + 1)
  const created = await Exercise.create({
    groupId: group._id,
    name: parsed.data.name,
    detail: parsed.data.detail || '',
    weighted: parsed.data.weighted,
    position
  })
  const out = serialize(created)
  broadcast(req.user._id, 'exercise:created', out)
  res.status(201).json(out)
})

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  detail: z.string().max(120).optional(),
  weighted: z.boolean().optional(),
  position: z.number().int().nonnegative().optional()
}).strict()

router.patch('/:id', async (req, res) => {
  const parsed = PatchBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const ex = await Exercise.findById(req.params.id).lean()
  if (!ex) return res.status(404).json({ error: 'not found' })
  if (!(await assertGroupOwnership(req.user._id, ex.groupId))) {
    return res.status(404).json({ error: 'not found' })
  }
  const updated = await Exercise.findByIdAndUpdate(
    req.params.id, { $set: parsed.data }, { new: true }
  ).lean()
  const out = serialize(updated)
  broadcast(req.user._id, 'exercise:updated', out)
  res.json(out)
})

router.delete('/:id', async (req, res) => {
  const ex = await Exercise.findById(req.params.id).lean()
  if (!ex) return res.status(404).json({ error: 'not found' })
  if (!(await assertGroupOwnership(req.user._id, ex.groupId))) {
    return res.status(404).json({ error: 'not found' })
  }
  await Exercise.deleteOne({ _id: ex._id })
  broadcast(req.user._id, 'exercise:deleted', { id: String(ex._id), groupId: String(ex.groupId) })
  res.status(204).end()
})

export default router
