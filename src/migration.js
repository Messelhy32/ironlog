// One-shot state migrator. Idempotent — safe to run on every load.
// Each migration runs only when state.prefs.schemaVersion is below its target.

import { DEFAULT_PROGRAM, LEGACY_SHIELD } from './data.js'
import { toKg } from './units.js'

const CURRENT = 2

export function migrate(state) {
  const prefs = { ...(state?.prefs || {}) }
  const v = prefs.schemaVersion || 0
  if (v >= CURRENT) return state

  const next = { ...state, prefs: { ...prefs } }

  // v0 → v1: introduce program + shield from defaults; convert lbs labels to lb.
  if ((next.prefs.schemaVersion || 0) < 1) {
    if (!next.program) next.program = clone(DEFAULT_PROGRAM)
    if (!next.shield) next.shield = clone(LEGACY_SHIELD)
    if (next.prefs.units === 'lbs') next.prefs.units = 'lb'
    if (!next.prefs.units) next.prefs.units = 'kg'
    next.prefs.schemaVersion = 1
  }

  // v1 → v2: per-log {weight, units} → weightKg (kg-canonical).
  if ((next.prefs.schemaVersion || 0) < 2) {
    const sessions = { ...(next.sessions || {}) }
    for (const [date, sess] of Object.entries(sessions)) {
      if (!sess || typeof sess !== 'object') continue
      const logs = { ...(sess.logs || {}) }
      let touched = false
      for (const [name, log] of Object.entries(logs)) {
        if (!log || typeof log !== 'object') continue
        if (log.weightKg != null) continue
        if (log.weight != null) {
          const unit = log.units === 'lbs' || log.units === 'lb' ? 'lb' : 'kg'
          const kg = toKg(log.weight, unit)
          const { weight, units, ...rest } = log
          logs[name] = { ...rest, weightKg: kg }
          touched = true
        }
      }
      if (touched) sessions[date] = { ...sess, logs }
    }
    next.sessions = sessions
    next.prefs.schemaVersion = 2
  }

  return next
}

const clone = (v) => JSON.parse(JSON.stringify(v))
