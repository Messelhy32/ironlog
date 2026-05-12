import express from 'express'
import { Program } from '../models/Program.js'
import { Day } from '../models/Day.js'
import { Group } from '../models/Group.js'
import { Exercise } from '../models/Exercise.js'
import { authMiddleware } from '../auth/middleware.js'
import { broadcast } from '../realtime/broadcast.js'
import { mongoose } from '../db.js'
import { seedProgramForUser, PRESETS } from '../seeds/programs.js'

const router = express.Router()
router.use(authMiddleware)

/** Build the full nested tree for a list of program docs. */
const buildTree = async (userId, programs) => {
  if (!programs.length) return []
  const programIds = programs.map(p => p._id)
  const days = await Day.find({ programId: { $in: programIds } }).sort({ position: 1 }).lean()
  const dayIds = days.map(d => d._id)
  const groups = await Group.find({ dayId: { $in: dayIds } }).sort({ position: 1 }).lean()
  const groupIds = groups.map(g => g._id)
  const exercises = await Exercise.find({ groupId: { $in: groupIds } }).sort({ position: 1 }).lean()

  const exByGroup = new Map()
  for (const e of exercises) {
    const arr = exByGroup.get(String(e.groupId)) || []
    arr.push({
      id: String(e._id), name: e.name, detail: e.detail || '',
      weighted: !!e.weighted, position: e.position
    })
    exByGroup.set(String(e.groupId), arr)
  }
  const groupsByDay = new Map()
  for (const g of groups) {
    const arr = groupsByDay.get(String(g.dayId)) || []
    arr.push({
      id: String(g._id), name: g.name, position: g.position,
      exercises: exByGroup.get(String(g._id)) || []
    })
    groupsByDay.set(String(g.dayId), arr)
  }
  const daysByProgram = new Map()
  for (const d of days) {
    const arr = daysByProgram.get(String(d.programId)) || []
    arr.push({
      id: String(d._id), label: d.label, title: d.title,
      emoji: d.emoji || null, accent: d.accent || null, position: d.position,
      groups: groupsByDay.get(String(d._id)) || []
    })
    daysByProgram.set(String(d.programId), arr)
  }
  return programs.map(p => ({
    id: String(p._id), name: p.name, position: p.position,
    days: daysByProgram.get(String(p._id)) || []
  }))
}

router.get('/', async (req, res) => {
  const programs = await Program.find({ userId: req.user._id }).sort({ position: 1 }).lean()
  res.json(await buildTree(req.user._id, programs))
})

router.get('/:id', async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, userId: req.user._id }).lean()
  if (!program) return res.status(404).json({ error: 'not found' })
  const [tree] = await buildTree(req.user._id, [program])
  res.json(tree)
})

router.post('/:id/reset', async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, userId: req.user._id })
  if (!program) return res.status(404).json({ error: 'not found' })

  // Reset is meaningful only when this program corresponds to one of the
  // shipped presets. Identify the preset by exact name (Hybrid / Original).
  const preset = PRESETS.find(p => p.name === program.name)
  if (!preset) return res.status(400).json({ error: 'no preset matches this program name' })

  const mSession = await mongoose.startSession()
  try {
    await mSession.withTransaction(async () => {
      const days = await Day.find({ programId: program._id }, { _id: 1 }, { session: mSession })
      const dayIds = days.map(d => d._id)
      const groups = await Group.find({ dayId: { $in: dayIds } }, { _id: 1 }, { session: mSession })
      const groupIds = groups.map(g => g._id)
      await Exercise.deleteMany({ groupId: { $in: groupIds } }, { session: mSession })
      await Group.deleteMany({ dayId: { $in: dayIds } }, { session: mSession })
      await Day.deleteMany({ programId: program._id }, { session: mSession })
      await seedProgramForUser(req.user._id, preset, { mSession, existingProgram: program })
    })
  } finally {
    await mSession.endSession()
  }

  const [tree] = await buildTree(req.user._id, [program])
  broadcast(req.user._id, 'program:reset', { programId: String(program._id) })
  res.json(tree)
})

export default router
