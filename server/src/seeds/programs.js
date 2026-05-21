import { Program } from '../models/Program.js'
import { Day } from '../models/Day.js'
import { Group } from '../models/Group.js'
import { Exercise } from '../models/Exercise.js'

const e = (name, detail, weighted = false) => ({ name, detail, weighted })
const g = (name, items) => ({ name, items })

// Shared 8-min warm-up — every Off-Season training session (injury shield).
const warmup = () => g('Warm-up (8 min — every session)', [
  e('Bike or Row (easy)', '3 min'),
  e('Spanish Squat Hold', '3×30s'),
  e('Band External Rotation', '2×15/side'),
  e('Wall Slides', '2×10'),
  e('90/90 Hip Switches', '2×8/side'),
  e('Dead Bug', '2×8/side')
])

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
  },
  {
    name: 'Off-Season (8wk)',
    position: 2,
    days: [
      {
        label: 'MON', title: 'Upper Push + Pull — Strength', emoji: '💪', accent: '#2563eb',
        groups: [
          warmup(),
          g('Strength (detail = Phase1 · Phase2)', [
            e('Landmine Press (split stance)', 'P1 4×8/s · P2 5×5/s', true),
            e('Chest-Supported DB Row', 'P1 4×10 · P2 4×6–8', true),
            e('Incline DB Press', 'P1 3×10 · P2 4×6', true),
            e('Neutral-Grip Pull-Up (or lat pulldown)', 'P1 3×AMRAP · P2 4×6–8 wtd', true),
            e('Face Pull', '3×15', true),
            e('Side-Lying External Rotation', '3×12/side', true)
          ])
        ]
      },
      {
        label: 'TUE', title: 'Lower Strength — Knee-Friendly', emoji: '🦵', accent: '#dc2626',
        groups: [
          warmup(),
          g('Strength (detail = Phase1 · Phase2)', [
            e('Trap Bar Deadlift', 'P1 4×6 · P2 5×4', true),
            e('Heel-Elevated Goblet / SSB Box Squat', 'P1 4×8 · P2 4×6', true),
            e('Bulgarian Split Squat', 'P1 3×8/leg · P2 4×6/leg', true),
            e('Nordic Hamstring (eccentric)', 'P1 3×5 · P2 3×6', true),
            e('Standing Calf Raise (full ROM)', 'P1 3×12 · P2 4×10', true),
            e('Copenhagen Plank', 'P1 3×20s/s · P2 3×30s/s')
          ])
        ]
      },
      {
        label: 'WED', title: 'Upper Hypertrophy + Throwing Power', emoji: '🤾', accent: '#2563eb',
        groups: [
          warmup(),
          g('Power', [
            e('Med Ball Chest Pass (wall)', 'P1 4×6 max · P2 5×4 max'),
            e('Med Ball Rotational Throw', '4×5/side')
          ]),
          g('Hypertrophy (detail = Phase1 · Phase2)', [
            e('1-Arm DB Bench Press', 'P1 3×10/s · P2 4×8/s', true),
            e('1-Arm DB Row', 'P1 3×10/s · P2 4×8/s', true),
            e('Y-Raise (incline bench)', '3×12', true),
            e('Hammer Curl', '3×10', true),
            e('Triceps Pushdown', '3×12', true),
            e('Hanging Knee Raise', 'P1 3×10 · P2 3×12', true)
          ])
        ]
      },
      {
        label: 'THU', title: 'Lower Power + Sprint', emoji: '⚡', accent: '#dc2626',
        groups: [
          warmup(),
          g('Plyo (detail = Phase1 · Phase2)', [
            e('Pogo Hops', 'P1 3×10 · P2 3×15'),
            e('Box Jump (soft landing)', 'P1 4×3 · P2 5×3'),
            e('Broad Jump', 'P1 4×3 · P2 5×3'),
            e('Lateral Bound', 'P2 only: 4×3/side'),
            e('Single-Leg Box Jump', 'P2 only: 3×3/side')
          ]),
          g('Strength', [
            e('Hip Thrust', 'P1 4×8 · P2 5×5', true),
            e('Romanian Deadlift', 'P1 3×8 · P2 4×6', true)
          ]),
          g('Sprints (full rest 2–3 min)', [
            e('Build-Ups 20m / 30m / 40m', 'P1 4×each · P2 5×each'),
            e('Sled Push (heavy, 15–20m)', 'P1 4 reps · P2 6 reps', true)
          ])
        ]
      },
      {
        label: 'FRI', title: 'Upper Press Volume + Carries + Core', emoji: '🏋️', accent: '#2563eb',
        groups: [
          warmup(),
          g('Press + Pull (detail = Phase1 · Phase2)', [
            e('Push-Up (regular → deficit → archer)', 'P1 4×AMRAP · P2 5×AMRAP', true),
            e('Landmine 1-Arm Press', 'P1 3×10/s · P2 4×8/s', true),
            e('Cable Row (heavy)', 'P1 4×10 · P2 4×8', true),
            e('Face Pull', '3×15', true)
          ]),
          g('Carries + Core', [
            e('Suitcase Carry', 'P1 3×30m/s · P2 4×30m/s', true),
            e('Pallof Press', '3×12/side', true),
            e('Decline Reverse Crunch', 'P1 3×12 · P2 3×15', true)
          ])
        ]
      },
      {
        label: 'SAT', title: 'Conditioning + Reactive Agility (RSA)', emoji: '🔥', accent: '#d97706',
        groups: [
          g('Block A — Reactive Agility (15 min)', [
            e('5-10-5 Shuttle', '4 reps'),
            e('Cone Mirror Drill (partner/wall)', '4×20s'),
            e('Backpedal-to-Sprint', '6 reps'),
            e('Shuffle-to-Sprint', '6/direction')
          ]),
          g('Block B — Repeat Sprint Ability (15 min)', [
            e('40m Sprint (walk-back ~30s)', '6 reps'),
            e('20m Sprint (20s rest)', '8 reps'),
            e('60m @ 80% (full recovery)', '4 reps')
          ]),
          g('Block C — Cool Down (10 min)', [
            e('Couch Stretch', '2 min/side'),
            e('90/90 Hold', '1 min/side'),
            e('Adductor Rockback', '10 reps'),
            e('Easy Bike', '5 min')
          ])
        ]
      },
      {
        label: 'SUN', title: 'Full Rest or Z2 + Mobility', emoji: '💤', accent: '#16a34a',
        groups: [
          g('Optional (if feeling good)', [
            e('Easy Bike or Incline Walk', '30 min Z2'),
            e('Mobility Flow', '15 min')
          ]),
          g('Otherwise', [ e('Full Rest', 'listen to your body') ])
        ]
      },
      {
        label: 'GATE', title: 'Phase 1 → 2 Re-Test (end of week 4)', emoji: '🎯', accent: '#7c3aed',
        groups: [
          g('Pass all 3 to advance to Phase 2', [
            e('Single-Leg Leg Press', '1.5× BW pain-free → unlocks front squat'),
            e('Shoulder Pain ≤ 1/10', 'on all lifts → unlocks clean pulls'),
            e('Bodyweight 84.5–85 kg', 'SMM stable or up')
          ]),
          g('If any gate fails', [ e('Repeat Phase 1', 'another 2–4 weeks, then re-test') ])
        ]
      },
      {
        label: 'FUEL', title: 'Nutrition — Light Cut (~2,800 kcal)', emoji: '🍽️', accent: '#16a34a',
        groups: [
          g('Daily Targets', [
            e('Calories', '2,800 (bump to 3,000 on Thu + Sat)'),
            e('Protein', '175–185 g (~2.1 g/kg)'),
            e('Carbs', '~320 g (load Thu + Sat)'),
            e('Fat', '70–80 g')
          ]),
          g('Around Training', [
            e('Pre-Workout', '30–40 g carbs + 20 g protein'),
            e('Post-Workout', '50–70 g carbs + 30–40 g protein')
          ]),
          g('Tracking', [
            e('Weigh-In', '3×/week, average it'),
            e('Target Rate', '0.3–0.5 kg/week loss'),
            e('If stalled 2+ weeks', 'drop 150 kcal')
          ])
        ]
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
