// One-shot seeder. Safe to run multiple times: only inserts what's missing.
// node src/seed.js   (or set SEED_ON_START=true and let index.js call seed())

import { env } from './env.js'
import { connect } from './db.js'
import { User } from './models/User.js'
import { Profile } from './models/Profile.js'
import { Program } from './models/Program.js'
import { Day } from './models/Day.js'
import { ShieldGroup, ShieldItem } from './models/Shield.js'
import { hashPassword } from './auth/password.js'
import { PRESETS, SHIELD_PRESET, seedProgramForUser } from './seeds/programs.js'

export async function seed() {
  await connect()

  let user = await User.findOne({ username: env.SEED_USERNAME })
  if (!user) {
    const passwordHash = await hashPassword(env.SEED_PASSWORD)
    user = await User.create({
      username: env.SEED_USERNAME,
      passwordHash,
      displayName: 'IRON'
    })
    console.log('[seed] created user:', user.username)
  } else {
    console.log('[seed] user already exists:', user.username)
  }

  // Programs — insert only if user has zero programs.
  const existingPrograms = await Program.find({ userId: user._id }).lean()
  if (!existingPrograms.length) {
    for (const preset of PRESETS) {
      await seedProgramForUser(user._id, preset)
      console.log('[seed] seeded program:', preset.name)
    }
  } else {
    console.log('[seed] programs already exist:', existingPrograms.length)
  }

  // Profile — point active program at Hybrid + day 1.
  const profile = await Profile.findOne({ userId: user._id })
  if (!profile) {
    const hybrid = await Program.findOne({ userId: user._id, name: 'Hybrid Athletic' }).lean()
    const firstDay = hybrid
      ? await Day.findOne({ programId: hybrid._id }).sort({ position: 1 }).lean()
      : null
    await Profile.create({
      userId: user._id,
      theme: 'dark', units: 'kg',
      activeProgramId: hybrid ? String(hybrid._id) : null,
      selectedDayId: firstDay ? String(firstDay._id) : null
    })
    console.log('[seed] created profile')
  }

  // Shield groups + items.
  const sgCount = await ShieldGroup.countDocuments({ userId: user._id })
  if (!sgCount) {
    for (let gi = 0; gi < SHIELD_PRESET.length; gi++) {
      const gSpec = SHIELD_PRESET[gi]
      const sg = await ShieldGroup.create({ userId: user._id, name: gSpec.name, position: gi })
      if (gSpec.items.length) {
        await ShieldItem.insertMany(gSpec.items.map((it, ii) => ({
          groupId: sg._id, position: ii, name: it.name, detail: it.detail
        })))
      }
    }
    console.log('[seed] seeded shield')
  }

  return user
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => {
    console.log('[seed] done')
    process.exit(0)
  }).catch(err => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })
}
