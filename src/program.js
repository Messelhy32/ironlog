// Pure helpers for editing a program object. All return new objects (immutable).
// Stable IDs are used so renaming an item or group doesn't orphan logs (logs key
// off exercise *name* — IDs are just for keying React lists and editor handles).

import { DEFAULT_PROGRAM, LEGACY_SHIELD, PROGRAM_PRESETS } from './data.js'

let counter = 0
export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28)

export const ensureItemIds = (program) => {
  let mutated = false
  const days = program.days.map(day => {
    const groups = (day.groups || []).map(g => {
      let gid = g.id
      if (!gid) { gid = `g_${slug(g.name)}_${newId('').slice(2, 6)}`; mutated = true }
      const items = (g.items || []).map(it => {
        if (it.id) return it
        mutated = true
        return { ...it, id: `e_${slug(it.name)}_${newId('').slice(2, 6)}` }
      })
      return { ...g, id: gid, items }
    })
    return { ...day, groups }
  })
  return mutated ? { ...program, days } : program
}

const replaceDay = (program, dayId, fn) => ({
  ...program,
  days: program.days.map(d => d.id === dayId ? fn(d) : d)
})

const replaceGroup = (day, groupId, fn) => ({
  ...day,
  groups: day.groups.map(g => g.id === groupId ? fn(g) : g)
})

export const addExercise = (program, dayId, groupId, item) =>
  replaceDay(program, dayId, day =>
    replaceGroup(day, groupId, g => ({
      ...g,
      items: [...g.items, { id: newId('e'), ...item }]
    }))
  )

export const removeExercise = (program, dayId, groupId, itemId) =>
  replaceDay(program, dayId, day =>
    replaceGroup(day, groupId, g => ({
      ...g,
      items: g.items.filter(it => it.id !== itemId)
    }))
  )

export const updateExercise = (program, dayId, groupId, itemId, patch) =>
  replaceDay(program, dayId, day =>
    replaceGroup(day, groupId, g => ({
      ...g,
      items: g.items.map(it => it.id === itemId ? { ...it, ...patch } : it)
    }))
  )

export const addGroup = (program, dayId, name) =>
  replaceDay(program, dayId, day => ({
    ...day,
    groups: [...day.groups, { id: newId('g'), name: name || 'New Group', items: [] }]
  }))

export const removeGroup = (program, dayId, groupId) =>
  replaceDay(program, dayId, day => ({
    ...day,
    groups: day.groups.filter(g => g.id !== groupId)
  }))

export const renameGroup = (program, dayId, groupId, name) =>
  replaceDay(program, dayId, day =>
    replaceGroup(day, groupId, g => ({ ...g, name: name || g.name }))
  )

/** Reset just one day to its preset version. Looks up the preset by program.id. */
export const resetDay = (program, dayId) => {
  const presetFn = PROGRAM_PRESETS[program?.id]
  const preset = presetFn ? presetFn() : DEFAULT_PROGRAM
  const fresh = preset.days.find(d => d.id === dayId)
  if (!fresh) return program
  return replaceDay(program, dayId, () => clone(fresh))
}

/** Fresh copy of a preset by id. */
export const presetProgram = (id) => {
  const fn = PROGRAM_PRESETS[id]
  return fn ? fn() : clone(DEFAULT_PROGRAM)
}

/** Legacy default reset (Hybrid). */
export const resetProgram = () => clone(DEFAULT_PROGRAM)
export const resetShield = () => clone(LEGACY_SHIELD)

const clone = (v) => JSON.parse(JSON.stringify(v))
