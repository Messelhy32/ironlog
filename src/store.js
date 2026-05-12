// Tiny global store. Components subscribe via useStore() and read fields
// off the snapshot. setStore(patch | fn) updates + notifies.

import { useSyncExternalStore } from 'react'

const empty = () => ({
  user: null,
  profile: { theme: 'dark', units: 'kg', activeProgramId: null, selectedDayId: null },
  programs: [],
  sessionsByDate: {},          // 'YYYY-MM-DD' → [ session ]
  history: [],                 // recent sessions
  prs: [],                     // [{ exerciseName, prKg, lastTs }]
  shield: [],                  // [{ id, name, items: [...] }]
  shieldLogsByDate: {}         // 'YYYY-MM-DD' → [ shieldLog ]
})

let state = empty()
const listeners = new Set()
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

export const getStore = () => state
export const setStore = (patch) => {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch }
  for (const l of listeners) l()
}
export const resetStore = () => setStore(empty())

export const useStore = () => useSyncExternalStore(subscribe, getStore)

// ──────────────────────────── helpers ────────────────────────────

export const activeProgram = (s = state) =>
  s.programs.find(p => String(p.id) === String(s.profile.activeProgramId))
  || s.programs[0]
  || null

export const findDay = (s, id) => {
  if (!id) return null
  for (const p of s.programs) {
    const d = p.days.find(d => String(d.id) === String(id))
    if (d) return d
  }
  return null
}

export const sessionFor = (s, date, dayId) => {
  const list = s.sessionsByDate[date] || []
  return list.find(x => String(x.dayId) === String(dayId)) || null
}

export const logsFor = (s, date, dayId) => {
  const sess = sessionFor(s, date, dayId)
  if (!sess) return {}
  const out = {}
  for (const l of sess.logs || []) out[l.exerciseName] = l
  return out
}

export const getPRKg = (s, exerciseName) =>
  s.prs.find(p => p.exerciseName === exerciseName)?.prKg ?? null

// ─── Mutations: optimistic + server reconcile ─────────────────────
// These wrap api.* calls so UI can call store.* and get an immediate update.

import { api } from './api.js'

const upsertSessionInStore = (date, dayId, session) => {
  setStore(s => {
    const list = (s.sessionsByDate[date] || []).filter(x => String(x.dayId) !== String(dayId))
    list.push(session)
    return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
  })
}

const updatePrInStore = (exerciseName, prKg) => {
  setStore(s => {
    const next = s.prs.filter(p => p.exerciseName !== exerciseName)
    if (prKg != null) next.push({ exerciseName, prKg, lastTs: Date.now() })
    next.sort((a, b) => b.prKg - a.prKg)
    return { ...s, prs: next }
  })
}

export const actions = {
  async hydrate(today) {
    const [me, programs, todaySessions, history, prs, shield, shieldLogs] = await Promise.all([
      api.auth.me(),
      api.programs.list(),
      api.sessions.byDate(today),
      api.sessions.history({ limit: 50 }),
      api.prs.list(),
      api.shield.get(),
      api.shield.logsByDate(today)
    ])
    setStore({
      user: me.user,
      profile: me.profile || { theme: 'dark', units: 'kg', activeProgramId: null, selectedDayId: null },
      programs,
      sessionsByDate: { [today]: todaySessions },
      history,
      prs,
      shield,
      shieldLogsByDate: { [today]: shieldLogs }
    })
  },

  async refreshSessions(date) {
    const sessions = await api.sessions.byDate(date)
    setStore(s => ({ ...s, sessionsByDate: { ...s.sessionsByDate, [date]: sessions } }))
  },

  async refreshHistory() {
    const history = await api.sessions.history({ limit: 50 })
    setStore(s => ({ ...s, history }))
  },

  async refreshPRs() {
    const prs = await api.prs.list()
    setStore(s => ({ ...s, prs }))
  },

  async setProfile(patch) {
    // Optimistic
    setStore(s => ({ ...s, profile: { ...s.profile, ...patch } }))
    const updated = await api.auth.updateProfile(patch)
    setStore(s => ({ ...s, profile: updated }))
  },

  async upsertLog({ date, dayId, exerciseName, done, weightKg, units }) {
    // Optimistic: write the log immediately.
    const optimistic = { exerciseName, done, weightKg: weightKg ?? null, ts: new Date().toISOString() }
    setStore(s => {
      const list = s.sessionsByDate[date] || []
      let sess = list.find(x => String(x.dayId) === String(dayId))
      let next
      if (!sess) {
        sess = { id: `tmp:${date}:${dayId}`, date, dayId, logs: [optimistic] }
        next = [...list, sess]
      } else {
        next = list.map(x => {
          if (String(x.dayId) !== String(dayId)) return x
          const logs = (x.logs || []).filter(l => l.exerciseName !== exerciseName)
          logs.push(optimistic)
          return { ...x, logs }
        })
      }
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: next } }
    })

    const { log, prKg } = await api.logs.upsert({ date, dayId, exerciseName, done, weightKg: weightKg ?? null })
    // Reconcile: replace the optimistic entry with the server's row.
    setStore(s => {
      const list = (s.sessionsByDate[date] || []).map(x => {
        if (String(x.dayId) !== String(dayId)) return x
        const logs = (x.logs || []).filter(l => l.exerciseName !== exerciseName)
        logs.push(log)
        return { ...x, logs, id: x.id?.startsWith('tmp:') ? log.sessionId : x.id }
      })
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
    })
    updatePrInStore(exerciseName, prKg)
    return { log, prKg }
  },

  async removeLog({ date, dayId, exerciseName }) {
    setStore(s => {
      const list = (s.sessionsByDate[date] || []).map(x => {
        if (String(x.dayId) !== String(dayId)) return x
        return { ...x, logs: (x.logs || []).filter(l => l.exerciseName !== exerciseName) }
      })
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
    })
    await api.logs.remove({ date, dayId, exerciseName })
    // Refresh PRs in case we removed the top one.
    actions.refreshPRs()
  },

  async resetSession({ date, dayId }) {
    setStore(s => {
      const list = (s.sessionsByDate[date] || []).filter(x => String(x.dayId) !== String(dayId))
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
    })
    await api.sessions.resetDay({ date, dayId })
    actions.refreshPRs()
  },

  async addGroup({ dayId, name }) {
    const group = await api.groups.create({ dayId, name })
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => String(d.id) !== String(dayId) ? d : { ...d, groups: [...d.groups, group] })
      }))
    }))
    return group
  },

  async renameGroup(id, name) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => String(g.id) === String(id) ? { ...g, name } : g)
        }))
      }))
    }))
    await api.groups.update(id, { name })
  },

  async removeGroup(id) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.filter(g => String(g.id) !== String(id))
        }))
      }))
    }))
    await api.groups.remove(id)
  },

  async addExercise({ groupId, name, detail, weighted }) {
    const ex = await api.exercises.create({ groupId, name, detail, weighted })
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => String(g.id) === String(groupId)
            ? { ...g, exercises: [...g.exercises, ex] } : g)
        }))
      }))
    }))
    return ex
  },

  async removeExercise(id) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => ({
            ...g,
            exercises: g.exercises.filter(e => String(e.id) !== String(id))
          }))
        }))
      }))
    }))
    await api.exercises.remove(id)
  },

  async resetProgram(id) {
    const tree = await api.programs.reset(id)
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => String(p.id) === String(id) ? tree : p)
    }))
  },

  async toggleShield({ date, itemId, done }) {
    setStore(s => {
      const list = (s.shieldLogsByDate[date] || []).filter(l => String(l.itemId) !== String(itemId))
      if (done) list.push({ itemId, date, done: true, ts: new Date().toISOString() })
      return { ...s, shieldLogsByDate: { ...s.shieldLogsByDate, [date]: list } }
    })
    await api.shield.upsertLog({ date, itemId, done })
  }
}

// ─── Realtime event reconciliation ────────────────────────────────
export const realtime = {
  onLogUpserted({ date, dayId, log, prKg }) {
    setStore(s => {
      const list = s.sessionsByDate[date] || []
      let next
      const existing = list.find(x => String(x.dayId) === String(dayId))
      if (!existing) {
        next = [...list, { id: log.sessionId, date, dayId, logs: [log] }]
      } else {
        next = list.map(x => {
          if (String(x.dayId) !== String(dayId)) return x
          const logs = (x.logs || []).filter(l => l.exerciseName !== log.exerciseName)
          logs.push(log)
          return { ...x, logs }
        })
      }
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: next } }
    })
    if (prKg != null) updatePrInStore(log.exerciseName, prKg)
  },

  onLogDeleted({ date, dayId, exerciseName }) {
    setStore(s => {
      const list = (s.sessionsByDate[date] || []).map(x => {
        if (String(x.dayId) !== String(dayId)) return x
        return { ...x, logs: (x.logs || []).filter(l => l.exerciseName !== exerciseName) }
      })
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
    })
  },

  onSessionReset({ date, dayId }) {
    setStore(s => {
      const list = (s.sessionsByDate[date] || []).filter(x => String(x.dayId) !== String(dayId))
      return { ...s, sessionsByDate: { ...s.sessionsByDate, [date]: list } }
    })
  },

  onShieldLogUpserted(payload) {
    const { date, itemId, done } = payload
    setStore(s => {
      const list = (s.shieldLogsByDate[date] || []).filter(l => String(l.itemId) !== String(itemId))
      if (done) list.push(payload)
      return { ...s, shieldLogsByDate: { ...s.shieldLogsByDate, [date]: list } }
    })
  },

  onProgramReset({ programId }) {
    // Refetch the one program tree (the API call already happened on the
    // originating device; here we just need the new tree). For simplicity,
    // refetch all programs.
    api.programs.list().then(programs => setStore(s => ({ ...s, programs })))
  },

  onExerciseCreated(ex) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => String(g.id) === String(ex.groupId)
            ? { ...g, exercises: [...g.exercises.filter(x => x.id !== ex.id), ex] }
            : g)
        }))
      }))
    }))
  },
  onExerciseUpdated(ex) { this.onExerciseCreated(ex) },
  onExerciseDeleted({ id }) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => ({ ...g, exercises: g.exercises.filter(e => String(e.id) !== String(id)) }))
        }))
      }))
    }))
  },

  onGroupCreated({ dayId, group }) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => String(d.id) !== String(dayId) ? d
          : { ...d, groups: [...d.groups.filter(g => g.id !== group.id), { ...group, exercises: group.exercises || [] }] })
      }))
    }))
  },
  onGroupUpdated(group) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({
          ...d,
          groups: d.groups.map(g => String(g.id) === String(group.id) ? { ...g, ...group } : g)
        }))
      }))
    }))
  },
  onGroupDeleted({ id }) {
    setStore(s => ({
      ...s,
      programs: s.programs.map(p => ({
        ...p,
        days: p.days.map(d => ({ ...d, groups: d.groups.filter(g => String(g.id) !== String(id)) }))
      }))
    }))
  }
}
