import express from 'express'
import { Log } from '../models/Log.js'
import { authMiddleware } from '../auth/middleware.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  const rows = await Log.aggregate([
    { $match: { userId: req.user._id, done: true, weightKg: { $ne: null } } },
    {
      $group: {
        _id: '$exerciseName',
        prKg: { $max: '$weightKg' },
        lastTs: { $max: '$ts' }
      }
    },
    { $sort: { prKg: -1 } }
  ])
  res.json(rows.map(r => ({
    exerciseName: r._id,
    prKg: r.prKg,
    lastTs: r.lastTs
  })))
})

export default router
