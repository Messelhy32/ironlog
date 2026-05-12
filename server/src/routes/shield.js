import express from 'express'
import { z } from 'zod'
import { ShieldGroup, ShieldItem, ShieldLog } from '../models/Shield.js'
import { authMiddleware } from '../auth/middleware.js'
import { broadcast } from '../realtime/broadcast.js'

const router = express.Router()
router.use(authMiddleware)

const dateRe = /^\d{4}-\d{2}-\d{2}$/

router.get('/', async (req, res) => {
  const groups = await ShieldGroup.find({ userId: req.user._id }).sort({ position: 1 }).lean()
  if (!groups.length) return res.json([])
  const items = await ShieldItem.find({ groupId: { $in: groups.map(g => g._id) } })
    .sort({ position: 1 }).lean()
  const itemsByGroup = new Map()
  for (const it of items) {
    const arr = itemsByGroup.get(String(it.groupId)) || []
    arr.push({ id: String(it._id), name: it.name, detail: it.detail || '', position: it.position })
    itemsByGroup.set(String(it.groupId), arr)
  }
  res.json(groups.map(g => ({
    id: String(g._id), name: g.name, position: g.position,
    items: itemsByGroup.get(String(g._id)) || []
  })))
})

router.get('/logs', async (req, res) => {
  const date = String(req.query.date || '')
  if (!dateRe.test(date)) return res.status(400).json({ error: 'date=YYYY-MM-DD required' })
  const logs = await ShieldLog.find({ userId: req.user._id, date }).lean()
  res.json(logs.map(l => ({
    id: String(l._id), itemId: String(l.itemId), date: l.date,
    done: !!l.done, ts: l.ts
  })))
})

const UpsertBody = z.object({
  date: z.string().regex(dateRe),
  itemId: z.string().min(1),
  done: z.boolean()
})

router.put('/logs', async (req, res) => {
  const parsed = UpsertBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'bad body' })
  const { date, itemId, done } = parsed.data
  const updated = await ShieldLog.findOneAndUpdate(
    { userId: req.user._id, date, itemId },
    { $set: { done, ts: new Date() } },
    { new: true, upsert: true }
  ).lean()
  const out = { id: String(updated._id), itemId: String(updated.itemId), date: updated.date, done: !!updated.done, ts: updated.ts }
  broadcast(req.user._id, 'shield:log:upserted', out)
  res.json(out)
})

export default router
