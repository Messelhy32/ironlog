// Static IRON LOG training schedule + supporting data.

export const DAYS = [
  { id: 'D1', label: 'D1', title: 'LOWER — Strength + Knee + APT', emoji: '🦵', accent: '#dc2626' },
  { id: 'D2', label: 'D2', title: 'UPPER — Strength + Shoulder',    emoji: '💪', accent: '#2563eb' },
  { id: 'D3', label: 'D3', title: 'RECOVERY',                       emoji: '🌿', accent: '#16a34a' },
  { id: 'D4', label: 'D4', title: 'LOWER — Power + Single Leg + APT', emoji: '⚡', accent: '#dc2626' },
  { id: 'D5', label: 'D5', title: 'UPPER — Hypertrophy + Balance',  emoji: '🏋️', accent: '#2563eb' },
  { id: 'D6', label: 'D6', title: 'SPEED + CONDITIONING',           emoji: '🔥', accent: '#d97706' },
  { id: 'D7', label: 'D7', title: 'REST',                           emoji: '💤', accent: '#7c3aed' }
]

export const SCHEDULE = {
  D1: [
    { group: 'Tendon Prep', items: [
      { name: 'Spanish Squat', detail: '3×45s' },
      { name: 'Leg Extension Isometric Hold', detail: '3×30s' }
    ]},
    { group: 'Activation', items: [
      { name: 'Couch Stretch', detail: '2×45s' },
      { name: 'Glute Bridge Hold', detail: '2×30s' },
      { name: 'Dead Bug', detail: '2×10' }
    ]},
    { group: 'Strength', items: [
      { name: 'Trap Bar Deadlift', detail: '4×5' },
      { name: 'Hip Thrust Machine', detail: '4×6' },
      { name: 'Romanian Deadlift', detail: '3×6' },
      { name: 'Bulgarian Split Squat', detail: '3×8' }
    ]},
    { group: 'Hamstrings', items: [
      { name: 'Nordic Curls', detail: '3×5' }
    ]},
    { group: 'Core', items: [
      { name: 'Decline Sit Ups', detail: '3×12' },
      { name: 'Copenhagen', detail: '3×30s' },
      { name: 'Hanging Knee Raises', detail: '3×10' }
    ]}
  ],
  D2: [
    { group: 'Shoulder Rehab', items: [
      { name: 'External Rotation', detail: '3×15' },
      { name: 'Face Pull', detail: '3×12 2s hold' },
      { name: 'Prone Y Raise', detail: '3×10' },
      { name: 'Wall Slides', detail: '2×12' }
    ]},
    { group: 'Strength', items: [
      { name: 'Pull-ups', detail: '4×6' },
      { name: 'Push-ups', detail: '3×12 tempo' },
      { name: 'Incline DB Press', detail: '3×6' },
      { name: 'Chest Supported Row', detail: '3×8' },
      { name: 'Landmine Press', detail: '3×8' }
    ]},
    { group: 'Power', items: [
      { name: 'Med Ball Rotational Throw', detail: '4×4' }
    ]},
    { group: 'Arms', items: [
      { name: 'Wrist Curls', detail: '3×15' },
      { name: 'Reverse Wrist Curls', detail: '3×15' },
      { name: 'Tricep Pushdown', detail: '3×12' }
    ]},
    { group: 'Core', items: [
      { name: 'Pallof Press', detail: '3×10' },
      { name: 'Hanging Knee Raises', detail: '3×10' }
    ]},
    { group: 'Posture Fix', items: [
      { name: 'Chin Tucks', detail: '2×10 3s hold' },
      { name: 'Face Pull', detail: '3×12' }
    ]}
  ],
  D3: [
    { group: 'Cardio', items: [
      { name: 'Incline Walk', detail: '30–40 min' }
    ]},
    { group: 'Mobility', items: [
      { name: 'Hip Mobility', detail: '15 min' },
      { name: 'Shoulder Mobility', detail: '15 min' }
    ]},
    { group: 'Calisthenics Circuit', items: [
      { name: 'Scapular Push-ups', detail: '2–3×12' },
      { name: 'Band Pull-Aparts', detail: '2–3×15' },
      { name: 'Chin Tucks', detail: '2×10' }
    ]}
  ],
  D4: [
    { group: 'APT Activation', items: [
      { name: 'Couch Stretch', detail: '2×45s' },
      { name: 'Dead Bug', detail: '2×10' }
    ]},
    { group: 'Power', items: [
      { name: 'Box Jump', detail: '4×3' },
      { name: 'Broad Jump', detail: '3×3' }
    ]},
    { group: 'Strength', items: [
      { name: 'Trap Bar Deadlift', detail: '3×5 light' },
      { name: 'B-Stance RDL', detail: '3×8 each' },
      { name: 'Step-Ups', detail: '3×10 each' }
    ]},
    { group: 'Calisthenics', items: [
      { name: 'Single-Leg Box Squat', detail: '2×6 each' }
    ]},
    { group: 'Hamstrings', items: [
      { name: 'Nordic Curls', detail: '3×4' }
    ]},
    { group: 'Core', items: [
      { name: 'Side Plank', detail: '3×40s' },
      { name: 'Back Extension Hold', detail: '3×30s' }
    ]}
  ],
  D5: [
    { group: 'Shoulder Prep', items: [
      { name: 'External Rotation', detail: '3×15' },
      { name: 'Face Pull', detail: '3×12' },
      { name: 'Prone Y Raise', detail: '3×10' },
      { name: 'Wall Slides', detail: '2×12' }
    ]},
    { group: 'Hypertrophy', items: [
      { name: 'Incline DB Press', detail: '3×10' },
      { name: 'Lat Pulldown', detail: '3×10' },
      { name: 'Seated Row', detail: '3×10' },
      { name: 'Lateral Raises', detail: '3×12' }
    ]},
    { group: 'Calisthenics', items: [
      { name: 'Dips', detail: '3×8' },
      { name: 'Inverted Rows', detail: '3×10' }
    ]},
    { group: 'Arms', items: [
      { name: 'Bicep Curls', detail: '3×12' },
      { name: 'Tricep Pushdown', detail: '3×12' }
    ]},
    { group: 'Core', items: [
      { name: 'Dead Bug', detail: '3×10' },
      { name: 'Reverse Crunch', detail: '3×12' }
    ]},
    { group: 'Posture Fix', items: [
      { name: 'Face Pull', detail: '3×12' },
      { name: 'Wall Slides', detail: '2×12' },
      { name: 'Chin Tucks', detail: '2×10' }
    ]}
  ],
  D6: [
    { group: 'Warm-up', items: [
      { name: 'Glute Bridges', detail: '2×15' },
      { name: 'A-Skips', detail: '2×20m' }
    ]},
    { group: 'Plyo', items: [
      { name: 'Box Jump', detail: '3×3' },
      { name: 'Lateral Bounds', detail: '3×4' }
    ]},
    { group: 'Acceleration', items: [
      { name: '20m Sprint', detail: '6×1' },
      { name: '30m Sprint', detail: '3×1' }
    ]},
    { group: 'Conditioning', items: [
      { name: 'Hill Sprints / Bike Intervals', detail: '6 rounds' }
    ]},
    { group: 'Posture Fix', items: [
      { name: 'Dead Hang', detail: '2×30s' },
      { name: 'Chin Tucks', detail: '2×10' },
      { name: 'Thoracic Extensions', detail: '2 min' }
    ]}
  ],
  D7: [
    { group: 'Rest', items: [
      { name: 'Light Walking', detail: 'easy pace, 20–30 min' }
    ]}
  ]
}

// Daily Injury + Posture Shield (shown every day, grouped)
export const SHIELD = [
  { group: '🦵 Knee', items: [
    { name: 'Spanish Squat', detail: '2×30s' }
  ]},
  { group: '💪 Shoulder', items: [
    { name: 'Band External Rotation', detail: '2×15' }
  ]},
  { group: '🧠 Core APT', items: [
    { name: 'Dead Bug', detail: '2×10' },
    { name: 'Reverse Crunch', detail: '2×12' }
  ]},
  { group: '🦴 Back/Hips', items: [
    { name: 'Couch Stretch', detail: '2×45s' },
    { name: 'Thoracic Rotations', detail: '2×10' }
  ]},
  { group: '🧍 Posture', items: [
    { name: 'Chin Tucks', detail: '2×10 3s hold' },
    { name: 'Wall Slides', detail: '2×12' },
    { name: 'Doorway Chest Stretch', detail: '2×30s' }
  ]}
]

export const WEIGHTED = new Set([
  'Trap Bar Deadlift',
  'Hip Thrust Machine',
  'Romanian Deadlift',
  'Bulgarian Split Squat',
  'Nordic Curls',
  'Decline Sit Ups',
  'Pull-ups',
  'Push-ups',
  'Incline DB Press',
  'Chest Supported Row',
  'Landmine Press',
  'Tricep Pushdown',
  'Lat Pulldown',
  'Seated Row',
  'Lateral Raises',
  'Bicep Curls',
  'Wrist Curls',
  'Reverse Wrist Curls',
  'B-Stance RDL',
  'Step-Ups',
  'Hanging Knee Raises',
  'Pallof Press',
  'Dips',
  'Inverted Rows',
  'Single-Leg Box Squat',
  'Scapular Push-ups',
  'Band Pull-Aparts'
])

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

// Returns ISO week number (1..53). Same week → same quote all 7 days.
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

// Given a JS Date, returns the day-of-week index 0..6 with Monday=0.
export function mondayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7
}

// YYYY-MM-DD in local time
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Returns the Monday Date of the week containing d.
export function mondayOfWeek(d = new Date()) {
  const m = new Date(d)
  m.setHours(0, 0, 0, 0)
  m.setDate(m.getDate() - mondayIndex(m))
  return m
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
