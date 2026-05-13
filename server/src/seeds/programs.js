import { Program } from '../models/Program.js'
import { Day } from '../models/Day.js'
import { Group } from '../models/Group.js'
import { Exercise } from '../models/Exercise.js'

const e = (name, detail, weighted = false) => ({ name, detail, weighted })
const g = (name, items) => ({ name, items })

export const PRESETS = [
  {
    name: 'Hybrid Athletic',
    position: 0,
    days: [
      {
        label: 'D1', title: 'Lower — Strength (75–90 min)', emoji: '🦵', accent: '#dc2626',
        groups: [
          g('Mobility + Activation (10–12 min)', [
            e('Couch Stretch', '2×45s'),
            e('90/90', '2×8 each'),
            e('Ankle Rocks', '2×10'),
            e('Glute Bridges', '2×15'),
            e('Dead Bug', '2×10')
          ]),
          g('Power (pick one)', [
            e('Box Jump', '4×3'),
            e('Broad Jump', '4×3')
          ]),
          g('Main Strength', [
            e('Trap Bar Deadlift', '5×5', true),
            e('Front Squat', '4×5', true),
            e('Romanian Deadlift', '3×6', true)
          ]),
          g('Unilateral (pick one)', [
            e('Bulgarian Split Squat', '3×8 each', true),
            e('Walking Lunges', '3×10 each', true)
          ]),
          g('Hamstring', [
            e('Nordic Curl', '3×5', true)
          ]),
          g('Core (pick one)', [
            e('Reverse Crunch', '3×12', true),
            e('Pallof Press', '3×10', true)
          ])
        ]
      },
      {
        label: 'D2', title: 'Upper — Strength (75–90 min)', emoji: '💪', accent: '#2563eb',
        groups: [
          g('Prep (10 min)', [
            e('Band External Rotation', '3×15'),
            e('Face Pull', '3×12'),
            e('Scap Wall Slides', '2×12'),
            e('Chin Tucks', '2×10')
          ]),
          g('Power', [
            e('Med Ball Rotational Throw', '4×4 each')
          ]),
          g('Main Lifts', [
            e('Bench Press', '5×5', true),
            e('Pull-Ups', '4×6', true),
            e('Chest Supported Row', '3×8', true),
            e('Landmine Press', '3×8', true)
          ]),
          g('Arm / Wrist Superset', [
            e('Hammer Curl', '3×12', true),
            e('Wrist Curls', '3×15', true)
          ]),
          g('Core', [
            e('Hanging Knee Raises', '3×10', true)
          ])
        ]
      },
      {
        label: 'D3', title: 'Recovery + Zone 2 + Mobility', emoji: '🌿', accent: '#16a34a',
        groups: [
          g('Cardio (35–45 min, moderate HR)', [
            e('Incline Walk', '35–45 min'),
            e('Bike', '35–45 min'),
            e('Row', '35–45 min')
          ]),
          g('Mobility — Hips', [
            e('Couch Stretch', '2×45s'),
            e('90/90', '2×8 each'),
            e('Adductor Rockback', '2×10')
          ]),
          g('Mobility — Upper', [
            e('Thoracic Rotation', '2×10'),
            e('Chest Stretch', '2×30s'),
            e('Dead Hang', '2×30s')
          ]),
          g('Posture', [
            e('Chin Tucks', '2×10'),
            e('Wall Slides', '2×12')
          ])
        ]
      },
      {
        label: 'D4', title: 'Speed + Sprints (45–60 min)', emoji: '⚡', accent: '#dc2626',
        groups: [
          g('Warm-up', [
            e('Glute Bridges', '2×15'),
            e('A-Skips', '2×20m')
          ]),
          g('Plyo', [
            e('Box Jump', '3×3'),
            e('Lateral Bounds', '3×4')
          ]),
          g('Sprints (full rest)', [
            e('20m Sprint', '6×1'),
            e('40m Sprint', '3×1')
          ]),
          g('Carries', [
            e('Farmer Carry', '20m', true)
          ])
        ]
      },
      {
        label: 'D5', title: 'Conditioning (45–60 min)', emoji: '🔥', accent: '#d97706',
        groups: [
          g('Main Circuit (4 rounds, 2 min rest)', [
            e('Row', '500m'),
            e('Kettlebell Swings', '×15', true),
            e('Burpees', '×10'),
            e('Farmer Carry', '20m', true)
          ])
        ]
      },
      {
        label: 'D6', title: 'Active Recovery + Mobility', emoji: '🌿', accent: '#16a34a',
        groups: [
          g('Light Movement', [
            e('Easy Walk / Bike', '20–30 min')
          ]),
          g('Mobility + Posture', [
            e('Couch Stretch', '2×45s'),
            e('Thoracic Rotation', '2×10'),
            e('Chin Tucks', '2×10'),
            e('Wall Slides', '2×12')
          ])
        ]
      },
      {
        label: 'D7', title: 'Full Rest', emoji: '💤', accent: '#7c3aed',
        groups: [
          g('Rest', [ e('Light Walking', '20–30 min easy') ])
        ]
      }
    ]
  },
  {
    name: 'Original',
    position: 1,
    days: [
      {
        label: 'D1', title: 'LOWER — Strength + Knee + APT', emoji: '🦵', accent: '#dc2626',
        groups: [
          g('Tendon Prep', [
            e('Spanish Squat', '3×45s'),
            e('Leg Extension Isometric Hold', '3×30s')
          ]),
          g('Activation', [
            e('Couch Stretch', '2×45s'),
            e('Glute Bridge Hold', '2×30s'),
            e('Dead Bug', '2×10')
          ]),
          g('Strength', [
            e('Trap Bar Deadlift', '4×5', true),
            e('Hip Thrust Machine', '4×6', true),
            e('Romanian Deadlift', '3×6', true),
            e('Bulgarian Split Squat', '3×8', true)
          ]),
          g('Hamstrings', [ e('Nordic Curls', '3×5', true) ]),
          g('Core', [
            e('Decline Sit Ups', '3×12', true),
            e('Copenhagen', '3×30s'),
            e('Hanging Knee Raises', '3×10', true)
          ])
        ]
      },
      {
        label: 'D2', title: 'UPPER — Strength + Shoulder', emoji: '💪', accent: '#2563eb',
        groups: [
          g('Shoulder Rehab', [
            e('External Rotation', '3×15'),
            e('Face Pull', '3×12 2s hold'),
            e('Prone Y Raise', '3×10'),
            e('Wall Slides', '2×12')
          ]),
          g('Strength', [
            e('Pull-ups', '4×6', true),
            e('Push-ups', '3×12 tempo', true),
            e('Incline DB Press', '3×6', true),
            e('Chest Supported Row', '3×8', true),
            e('Landmine Press', '3×8', true)
          ]),
          g('Power', [ e('Med Ball Rotational Throw', '4×4') ]),
          g('Arms', [
            e('Wrist Curls', '3×15', true),
            e('Reverse Wrist Curls', '3×15', true),
            e('Tricep Pushdown', '3×12', true)
          ]),
          g('Core', [
            e('Pallof Press', '3×10', true),
            e('Hanging Knee Raises', '3×10', true)
          ]),
          g('Posture Fix', [
            e('Chin Tucks', '2×10 3s hold'),
            e('Face Pull', '3×12')
          ])
        ]
      },
      {
        label: 'D3', title: 'RECOVERY', emoji: '🌿', accent: '#16a34a',
        groups: [
          g('Cardio', [ e('Incline Walk', '30–40 min') ]),
          g('Mobility', [
            e('Hip Mobility', '15 min'),
            e('Shoulder Mobility', '15 min')
          ]),
          g('Calisthenics Circuit', [
            e('Scapular Push-ups', '2–3×12', true),
            e('Band Pull-Aparts', '2–3×15', true),
            e('Chin Tucks', '2×10')
          ])
        ]
      },
      {
        label: 'D4', title: 'LOWER — Power + Single Leg + APT', emoji: '⚡', accent: '#dc2626',
        groups: [
          g('APT Activation', [
            e('Couch Stretch', '2×45s'),
            e('Dead Bug', '2×10')
          ]),
          g('Power', [
            e('Box Jump', '4×3'),
            e('Broad Jump', '3×3')
          ]),
          g('Strength', [
            e('Trap Bar Deadlift', '3×5 light', true),
            e('B-Stance RDL', '3×8 each', true),
            e('Step-Ups', '3×10 each', true)
          ]),
          g('Calisthenics', [ e('Single-Leg Box Squat', '2×6 each', true) ]),
          g('Hamstrings', [ e('Nordic Curls', '3×4', true) ]),
          g('Core', [
            e('Side Plank', '3×40s'),
            e('Back Extension Hold', '3×30s')
          ])
        ]
      },
      {
        label: 'D5', title: 'UPPER — Hypertrophy + Balance', emoji: '🏋️', accent: '#2563eb',
        groups: [
          g('Shoulder Prep', [
            e('External Rotation', '3×15'),
            e('Face Pull', '3×12'),
            e('Prone Y Raise', '3×10'),
            e('Wall Slides', '2×12')
          ]),
          g('Hypertrophy', [
            e('Incline DB Press', '3×10', true),
            e('Lat Pulldown', '3×10', true),
            e('Seated Row', '3×10', true),
            e('Lateral Raises', '3×12', true)
          ]),
          g('Calisthenics', [
            e('Dips', '3×8', true),
            e('Inverted Rows', '3×10', true)
          ]),
          g('Arms', [
            e('Bicep Curls', '3×12', true),
            e('Tricep Pushdown', '3×12', true)
          ]),
          g('Core', [
            e('Dead Bug', '3×10'),
            e('Reverse Crunch', '3×12')
          ]),
          g('Posture Fix', [
            e('Face Pull', '3×12'),
            e('Wall Slides', '2×12'),
            e('Chin Tucks', '2×10')
          ])
        ]
      },
      {
        label: 'D6', title: 'SPEED + CONDITIONING', emoji: '🔥', accent: '#d97706',
        groups: [
          g('Warm-up', [
            e('Glute Bridges', '2×15'),
            e('A-Skips', '2×20m')
          ]),
          g('Plyo', [
            e('Box Jump', '3×3'),
            e('Lateral Bounds', '3×4')
          ]),
          g('Acceleration', [
            e('20m Sprint', '6×1'),
            e('30m Sprint', '3×1')
          ]),
          g('Conditioning', [ e('Hill Sprints / Bike Intervals', '6 rounds') ]),
          g('Posture Fix', [
            e('Dead Hang', '2×30s'),
            e('Chin Tucks', '2×10'),
            e('Thoracic Extensions', '2 min')
          ])
        ]
      },
      {
        label: 'D7', title: 'REST', emoji: '💤', accent: '#7c3aed',
        groups: [ g('Rest', [ e('Light Walking', 'easy pace, 20–30 min') ]) ]
      }
    ]
  }
]

export const SHIELD_PRESET = [
  g('🦵 Knee', [ e('Spanish Squat', '2×30s') ]),
  g('💪 Shoulder', [ e('Band External Rotation', '2×15') ]),
  g('🧠 Core APT', [
    e('Dead Bug', '2×10'),
    e('Reverse Crunch', '2×12')
  ]),
  g('🦴 Back/Hips', [
    e('Couch Stretch', '2×45s'),
    e('Thoracic Rotations', '2×10')
  ]),
  g('🧍 Posture', [
    e('Chin Tucks', '2×10 3s hold'),
    e('Wall Slides', '2×12'),
    e('Doorway Chest Stretch', '2×30s')
  ])
]

/**
 * Insert a preset under a user.
 * If existingProgram is supplied, day/group/exercise rows are inserted under it.
 * Otherwise a fresh Program row is created.
 */
export async function seedProgramForUser(userId, preset, opts = {}) {
  const { mSession, existingProgram } = opts
  const program = existingProgram
    || await Program.create([{ userId, name: preset.name, position: preset.position }], { session: mSession }).then(r => r[0])

  for (let di = 0; di < preset.days.length; di++) {
    const dSpec = preset.days[di]
    const [dayDoc] = await Day.create([{
      programId: program._id,
      position: di,
      label: dSpec.label,
      title: dSpec.title,
      emoji: dSpec.emoji,
      accent: dSpec.accent
    }], { session: mSession })

    for (let gi = 0; gi < dSpec.groups.length; gi++) {
      const gSpec = dSpec.groups[gi]
      const [groupDoc] = await Group.create([{
        dayId: dayDoc._id,
        position: gi,
        name: gSpec.name
      }], { session: mSession })

      if (gSpec.items.length) {
        await Exercise.insertMany(
          gSpec.items.map((it, ei) => ({
            groupId: groupDoc._id,
            position: ei,
            name: it.name,
            detail: it.detail,
            weighted: !!it.weighted
          })),
          { session: mSession, ordered: true }
        )
      }
    }
  }
  return program
}
