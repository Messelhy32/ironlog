// One-shot: rebuild the Hybrid Athletic program from seeds/programs.js.
// Deletes existing Day/Group/Exercise rows under the user's Hybrid program,
// re-inserts them from the current preset, and re-points the Profile's
// selectedDayId at the first new day if it pointed at a deleted day.
//
// Usage: MONGODB_URI=... node src/migrate-hybrid.js [username]

import mongoose from 'mongoose'
import { env } from './env.js'
import { connect } from './db.js'
import { User } from './models/User.js'
import { Profile } from './models/Profile.js'
import { Program } from './models/Program.js'
import { Day } from './models/Day.js'
import { Group } from './models/Group.js'
import { Exercise } from './models/Exercise.js'
import { PRESETS, seedProgramForUser } from './seeds/programs.js'

async function run() {
  const username = process.argv[2] || env.SEED_USERNAME
  await connect()

  const user = await User.findOne({ username })
  if (!user) throw new Error(`user not found: ${username}`)

  const program = await Program.findOne({ userId: user._id, name: 'Hybrid Athletic' })
  if (!program) throw new Error(`Hybrid Athletic program not found for ${username}`)

  const hybridPreset = PRESETS.find(p => p.name === 'Hybrid Athletic')
  if (!hybridPreset) throw new Error('Hybrid Athletic preset missing in seeds/programs.js')

  const oldDays = await Day.find({ programId: program._id }).select('_id').lean()
  const oldDayIds = oldDays.map(d => d._id)
  const oldGroups = await Group.find({ dayId: { $in: oldDayIds } }).select('_id').lean()
  const oldGroupIds = oldGroups.map(g => g._id)

  const exDel = await Exercise.deleteMany({ groupId: { $in: oldGroupIds } })
  const grpDel = await Group.deleteMany({ dayId: { $in: oldDayIds } })
  const dayDel = await Day.deleteMany({ programId: program._id })
  console.log(`[migrate] cleared: ${dayDel.deletedCount} days, ${grpDel.deletedCount} groups, ${exDel.deletedCount} exercises`)

  await seedProgramForUser(user._id, hybridPreset, { existingProgram: program })
  console.log('[migrate] re-seeded Hybrid Athletic')

  const profile = await Profile.findOne({ userId: user._id })
  if (profile && profile.selectedDayId && oldDayIds.some(id => String(id) === profile.selectedDayId)) {
    const firstDay = await Day.findOne({ programId: program._id }).sort({ position: 1 }).lean()
    profile.selectedDayId = firstDay ? String(firstDay._id) : null
    await profile.save()
    console.log('[migrate] re-pointed Profile.selectedDayId to', profile.selectedDayId)
  }
}

run().then(async () => {
  console.log('[migrate] done')
  await mongoose.disconnect()
  process.exit(0)
}).catch(async (err) => {
  console.error('[migrate] failed:', err)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
