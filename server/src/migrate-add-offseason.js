// One-shot: add (or rebuild) the "Off-Season (8wk)" program for the user.
// If the program doesn't exist yet, it's created fresh at its preset position.
// If it already exists, its Day/Group/Exercise rows are cleared and re-seeded
// from the current preset (re-pointing Profile.selectedDayId if needed).
// Re-runnable.
//
// Usage: MONGODB_URI=... node src/migrate-add-offseason.js [username]

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

const PROGRAM_NAME = 'Off-Season (8wk)'

async function run() {
  const username = process.argv[2] || env.SEED_USERNAME
  await connect()

  const user = await User.findOne({ username })
  if (!user) throw new Error(`user not found: ${username}`)

  const preset = PRESETS.find(p => p.name === PROGRAM_NAME)
  if (!preset) throw new Error(`${PROGRAM_NAME} preset missing in seeds/programs.js`)

  let program = await Program.findOne({ userId: user._id, name: PROGRAM_NAME })

  if (program) {
    const oldDays = await Day.find({ programId: program._id }).select('_id').lean()
    const oldDayIds = oldDays.map(d => d._id)
    const oldGroups = await Group.find({ dayId: { $in: oldDayIds } }).select('_id').lean()
    const oldGroupIds = oldGroups.map(g => g._id)

    const exDel = await Exercise.deleteMany({ groupId: { $in: oldGroupIds } })
    const grpDel = await Group.deleteMany({ dayId: { $in: oldDayIds } })
    const dayDel = await Day.deleteMany({ programId: program._id })
    console.log(`[migrate] existing ${PROGRAM_NAME} cleared: ${dayDel.deletedCount} days, ${grpDel.deletedCount} groups, ${exDel.deletedCount} exercises`)

    await seedProgramForUser(user._id, preset, { existingProgram: program })
    console.log(`[migrate] re-seeded ${PROGRAM_NAME}`)

    const profile = await Profile.findOne({ userId: user._id })
    if (profile && profile.selectedDayId && oldDayIds.some(id => String(id) === profile.selectedDayId)) {
      const firstDay = await Day.findOne({ programId: program._id }).sort({ position: 1 }).lean()
      profile.selectedDayId = firstDay ? String(firstDay._id) : null
      await profile.save()
      console.log('[migrate] re-pointed Profile.selectedDayId to', profile.selectedDayId)
    }
  } else {
    program = await seedProgramForUser(user._id, preset)
    console.log(`[migrate] created new program ${PROGRAM_NAME} (${program._id}) at position ${preset.position}`)
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
