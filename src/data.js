// IRON LOG static data: legacy + default program seeds, library, helpers.

let _id = 0
const e = (name, detail, weighted = false) => ({ id: `e_${++_id}`, name, detail, weighted })
const g = (name, items) => ({ id: `g_${++_id}`, name, items })

/* ────────────────────── LEGACY PROGRAM (D1–D7) ────────────────────── */
// Kept for the Library and for old session history readability. NOT the
// runnable schedule anymore — that's DEFAULT_PROGRAM (Hybrid Athletic).

export const LEGACY_PROGRAM = {
  days: [
    {
      id: 'D1', label: 'D1', title: 'LOWER — Strength + Knee + APT',
      emoji: '🦵', accent: '#dc2626',
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
      id: 'D2', label: 'D2', title: 'UPPER — Strength + Shoulder',
      emoji: '💪', accent: '#2563eb',
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
      id: 'D3', label: 'D3', title: 'RECOVERY',
      emoji: '🌿', accent: '#16a34a',
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
      id: 'D4', label: 'D4', title: 'LOWER — Power + Single Leg + APT',
      emoji: '⚡', accent: '#dc2626',
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
      id: 'D5', label: 'D5', title: 'UPPER — Hypertrophy + Balance',
      emoji: '🏋️', accent: '#2563eb',
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
      id: 'D6', label: 'D6', title: 'SPEED + CONDITIONING',
      emoji: '🔥', accent: '#d97706',
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
      id: 'D7', label: 'D7', title: 'REST',
      emoji: '💤', accent: '#7c3aed',
      groups: [ g('Rest', [ e('Light Walking', 'easy pace, 20–30 min') ]) ]
    }
  ]
}

/* ─────────────────── DEFAULT PROGRAM (HYBRID ATHLETIC) ─────────────────── */
// This is what new users (and existing users on first migration) get seeded.
// Day IDs are weekday-keyed so the TODAY view auto-selects by current weekday.

export const DEFAULT_PROGRAM = {
  days: [
    {
      id: 'mon', label: 'MON', title: 'Athletic Lower + Agility',
      emoji: '🦵', accent: '#dc2626',
      groups: [
        g('Warm-Up', [
          e('Couch Stretch', '2×45s'),
          e('Thoracic Rotations', '2×10'),
          e('Ankle Rocks', '2×10')
        ]),
        g('Activation', [
          e('Spanish Squat', '2×30s'),
          e('Glute Bridges', '2×15'),
          e('Dead Bug', '2×10')
        ]),
        g('Agility Ladder', [
          e('One Foot Each Box', '×2'),
          e('In-In-Out-Out', '×2'),
          e('Lateral Quick Steps', '×2'),
          e('Icky Shuffle', '×2')
        ]),
        g('Plyometrics', [
          e('Box Jump', '4×3'),
          e('Broad Jump', '3×3')
        ]),
        g('Strength', [
          e('Trap Bar Deadlift', '5×5', true),
          e('Front Squat', '4×5', true),
          e('Romanian Deadlift', '3×6', true),
          e('Walking Lunges', '3×10 each', true)
        ]),
        g('Athletic Finisher (3 rounds)', [
          e('Sled Push', '20m', true),
          e('Kettlebell Swings', '×15', true),
          e('Farmer Carry', '20m', true)
        ]),
        g('Core + APT', [
          e('Decline Reverse Crunch', '3×12', true),
          e('Pallof Press', '3×10', true),
          e('Copenhagen Plank', '3×30s')
        ])
      ]
    },
    {
      id: 'tue', label: 'TUE', title: 'Athletic Upper + Shoulder',
      emoji: '💪', accent: '#2563eb',
      groups: [
        g('Shoulder Prep', [
          e('Band External Rotation', '3×15'),
          e('Face Pull', '3×12'),
          e('Scap Wall Slides', '2×12'),
          e('Chin Tucks', '2×10')
        ]),
        g('Power', [
          e('Med Ball Slams', '4×5', true),
          e('Rotational Throws', '4×4 each', true)
        ]),
        g('Main Strength', [
          e('Bench Press', '5×5', true),
          e('Pull-Ups', '4×6', true),
          e('Incline DB Press', '3×8', true),
          e('Chest Supported Row', '3×8', true),
          e('Landmine Press', '3×8', true)
        ]),
        g('Functional Block (3 rounds)', [
          e('Battle Ropes', '30s'),
          e('Push-Ups', '×15'),
          e('Sled Pull', '20m', true)
        ]),
        g('Arms + Wrist', [
          e('Wrist Curls', '3×15', true),
          e('Reverse Wrist Curls', '3×15', true),
          e('Hammer Curl', '3×12', true),
          e('Rope Pushdown', '3×12', true)
        ])
      ]
    },
    {
      id: 'wed', label: 'WED', title: 'Recovery + Zone 2 + Mobility',
      emoji: '🌿', accent: '#16a34a',
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
      id: 'thu', label: 'THU', title: 'Explosive Full Body + Speed',
      emoji: '⚡', accent: '#dc2626',
      groups: [
        g('Agility / Footwork', [
          e('Ladder Lateral Run', '×2'),
          e('Single Leg Hop Pattern', '×2'),
          e('Quick Feet Forward/Back', '×2')
        ]),
        g('Olympic Lift', [
          e('Power Clean', '5×3 light + explosive', true)
        ]),
        g('Explosive Block', [
          e('Trap Bar Jumps', '4×3', true),
          e('Box Jump', '3×3'),
          e('Lateral Bounds', '3×5')
        ]),
        g('Speed (full rest)', [
          e('20m Sprint', '6×1'),
          e('30m Sprint', '3×1')
        ]),
        g('Athletic Circuit (4 rounds, 90s rest)', [
          e('Kettlebell Swings', '×15', true),
          e('Burpees', '×10'),
          e('Row / Ski Erg', '250m'),
          e('Farmer Carry', '20m', true)
        ])
      ]
    },
    {
      id: 'fri', label: 'FRI', title: 'Hybrid Conditioning (Hyrox Style)',
      emoji: '🔥', accent: '#d97706',
      groups: [
        g('Main Circuit (5 rounds, 2–3 min rest)', [
          e('Row', '500m'),
          e('Walking Lunges', '×20', true),
          e('Burpees', '×15'),
          e('Wall Balls', '×20', true),
          e('Sled Push', '20m', true),
          e('Farmer Carry', '20m', true)
        ])
      ]
    },
    {
      id: 'sat', label: 'SAT', title: 'Agility + Sprint + Mobility',
      emoji: '🏃', accent: '#2563eb',
      groups: [
        g('Warm-up', [
          e('Glute Bridges', '×15'),
          e('Dead Bug', '×10')
        ]),
        g('Agility', [
          e('Cone Shuffle Drill', '×4'),
          e('5-10-5 Drill', '×4'),
          e('Shuffle → Sprint', '×4'),
          e('Backpedal → Sprint', '×4')
        ]),
        g('Sprint', [
          e('20m Sprint', '6×1'),
          e('40m Sprint', '3×1')
        ]),
        g('Carries', [
          e('Farmer Carry', '20m', true),
          e('Offset Carry', '20m', true)
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
      id: 'sun', label: 'SUN', title: 'Full Rest',
      emoji: '💤', accent: '#7c3aed',
      groups: [ g('Rest', [ e('Light Walking', '20–30 min easy') ]) ]
    }
  ]
}

/* ─────────────────────── INJURY SHIELD (default) ─────────────────────── */

export const LEGACY_SHIELD = [
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

/* ─────────────────────── LIBRARY (de-duplicated) ─────────────────────── */
// Built from union of items in both seed programs. Tagged with origin labels.

const collectFrom = (program, programLabel) => {
  const out = []
  for (const day of program.days) {
    for (const grp of day.groups) {
      for (const it of grp.items) {
        out.push({
          name: it.name,
          detail: it.detail,
          weighted: !!it.weighted,
          origin: `${programLabel} · ${day.label}`
        })
      }
    }
  }
  return out
}

const dedupe = (items) => {
  const map = new Map()
  for (const it of items) {
    const key = it.name.toLowerCase()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...it, origins: [it.origin] })
    } else {
      existing.weighted = existing.weighted || it.weighted
      if (!existing.origins.includes(it.origin)) existing.origins.push(it.origin)
    }
  }
  return [...map.values()]
    .map(({ origin, ...rest }) => rest)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const LIBRARY = dedupe([
  ...collectFrom(DEFAULT_PROGRAM, 'Hybrid'),
  ...collectFrom(LEGACY_PROGRAM, 'Original')
])

/** Legacy: "is this exercise weighted?" — derived for any name we know. */
export const WEIGHTED = new Set(LIBRARY.filter(x => x.weighted).map(x => x.name))

export const isWeighted = (name) => WEIGHTED.has(name)

/* ─────────────────────────── QUOTES + DATES ─────────────────────────── */

export const QUOTES = [
  { text: 'The body achieves what the mind believes.', author: 'Napoleon Hill' },
  { text: 'Train insane or remain the same.' },
  { text: "Every rep is a vote for the person you're becoming." },
  { text: "Strength doesn't come from what you can do. It comes from overcoming the things you thought you couldn't.", author: 'Rikki Rogers' },
  { text: "The pain you feel today is the strength you'll feel tomorrow." },
  { text: "You don't have to be extreme. Just consistent." },
  { text: 'One week of skipping becomes two. Show up anyway.' },
  { text: "Results don't care about your excuses." },
  { text: 'It never gets easier. You just get stronger.' },
  { text: 'Small steps every day beat big leaps once in a while.' },
  { text: 'Your only competition is who you were yesterday.' },
  { text: "Champions aren't made in gyms.", author: 'Muhammad Ali' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese proverb' },
  { text: 'Discipline is choosing between what you want now and what you want most.' },
  { text: "A year from now you'll wish you had started today.", author: 'Karen Lamb' }
]

export function getISOWeek(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
}

export function quoteOfWeek(d = new Date()) {
  return QUOTES[getISOWeek(d) % QUOTES.length]
}

export function mondayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7
}

export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function mondayOfWeek(d = new Date()) {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  m.setDate(m.getDate() - mondayIndex(m))
  return m
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const prettyDayDate = (d = new Date()) => {
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]
  return `${m} ${d.getDate()}`
}
