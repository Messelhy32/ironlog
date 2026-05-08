// IRON LOG sync layer
// ──────────────────────────────────────────────────────────────────────────
// Source of truth: D1 (via /api/state). localStorage is a hot cache so the
// UI is instant on cold load and keeps working offline.
//
// Sync model:
//   - On startup: hydrate from cache, then fetch server. If server is newer,
//     replace local. If local has unsynced edits (dirty), push them up.
//   - On every state change: write to cache immediately, then debounced PUT.
//   - Offline writes queue automatically (we always retry until ok).

const CACHE_KEY = 'ironlog.v1'
const META_KEY = 'ironlog.v1.meta'   // { updated_at, dirty }
const PASS_KEY = 'ironlog.v1.pass'

export const getPasscode = () => {
  try { return localStorage.getItem(PASS_KEY) || '' } catch { return '' }
}
export const setPasscode = (v) => {
  try { localStorage.setItem(PASS_KEY, String(v || '')) } catch {}
}
export const clearPasscode = () => {
  try { localStorage.removeItem(PASS_KEY) } catch {}
}

const authHeaders = () => {
  const p = getPasscode()
  return p ? { authorization: `Bearer ${p}` } : {}
}

// Bubbles up to the UI; the App listens for this and pops a passcode prompt.
class UnauthorizedError extends Error {
  constructor() { super('unauthorized'); this.code = 'unauthorized' }
}

const empty = () => ({
  prefs: { theme: 'dark', units: 'kg', selectedDay: null },
  sessions: {}
})

const merge = (parsed) => ({
  ...empty(),
  ...parsed,
  prefs: { ...empty().prefs, ...(parsed?.prefs || {}) },
  sessions: { ...(parsed?.sessions || {}) }
})

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? merge(JSON.parse(raw)) : empty()
  } catch {
    return empty()
  }
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    return raw ? JSON.parse(raw) : { updated_at: 0, dirty: false }
  } catch {
    return { updated_at: 0, dirty: false }
  }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function writeCache(state) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(state))
}

async function fetchServer() {
  const r = await fetch('/api/state', {
    headers: { accept: 'application/json', ...authHeaders() }
  })
  if (r.status === 401) throw new UnauthorizedError()
  if (!r.ok) throw new Error(`GET /api/state ${r.status}`)
  return r.json()  // { data, updated_at }
}

async function putServer(state, base) {
  const r = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ data: state, base })
  })
  if (r.status === 401) throw new UnauthorizedError()
  if (r.status === 409) {
    const j = await r.json().catch(() => ({}))
    const err = new Error('stale')
    err.code = 'stale'
    err.serverUpdatedAt = j.updated_at
    throw err
  }
  if (!r.ok) throw new Error(`PUT /api/state ${r.status}`)
  return r.json()  // { updated_at }
}

const isEmptyState = (s) =>
  !s || (Object.keys(s.sessions || {}).length === 0)

/**
 * Build a Sync controller. Use `onStatus` to update the UI badge.
 *   status: 'idle' | 'loading' | 'saving' | 'offline' | 'error' | 'synced'
 */
export function createSync({ onRemoteState, onStatus, onAuthRequired }) {
  let pending = null
  let saveTimer = null
  let inFlight = false
  let lastServerAt = loadMeta().updated_at

  const setStatus = (s) => onStatus && onStatus(s)

  const flush = async () => {
    if (inFlight || !pending) return
    if (!navigator.onLine) {
      setStatus('offline')
      return
    }
    inFlight = true
    setStatus('saving')
    const snapshot = pending
    pending = null
    try {
      const { updated_at } = await putServer(snapshot, lastServerAt)
      lastServerAt = updated_at
      saveMeta({ updated_at, dirty: false })
      setStatus('synced')
    } catch (e) {
      if (e.code === 'unauthorized') {
        pending = snapshot
        saveMeta({ updated_at: lastServerAt, dirty: true })
        setStatus('error')
        onAuthRequired && onAuthRequired()
        return
      }
      // Stale: server moved (other device). Pull, merge by sessions, retry once.
      if (e.code === 'stale') {
        try {
          const fresh = await fetchServer()
          const merged = mergeStates(merge(fresh.data), snapshot)
          lastServerAt = fresh.updated_at
          // bump pending to merged so next flush sends the union
          pending = merged
          onRemoteState && onRemoteState(merged, 'merged')
        } catch {
          pending = snapshot
        }
        inFlight = false
        scheduleFlush(50)
        return
      }
      // Network/other error → keep pending, mark dirty, try again later.
      pending = snapshot
      saveMeta({ updated_at: lastServerAt, dirty: true })
      setStatus(navigator.onLine ? 'error' : 'offline')
    } finally {
      inFlight = false
      // If more edits arrived while we were saving, flush again.
      if (pending) scheduleFlush(150)
    }
  }

  const scheduleFlush = (delay = 350) => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, delay)
  }

  // Public API ────────────────────────────────────────────────────────
  return {
    /** Load: cache first (sync), then fetch server async. Returns initial. */
    bootstrap: async () => {
      const cached = loadCache()
      const meta = loadMeta()
      setStatus('loading')
      let fresh
      try {
        fresh = await fetchServer()
      } catch (e) {
        if (e.code === 'unauthorized') {
          setStatus('error')
          onAuthRequired && onAuthRequired()
        } else {
          setStatus(navigator.onLine ? 'error' : 'offline')
        }
        return cached
      }
      const server = merge(fresh.data)
      lastServerAt = fresh.updated_at || 0

      if (meta.dirty) {
        pending = cached
        saveMeta({ updated_at: lastServerAt, dirty: true })
        scheduleFlush(50)
        return cached
      }
      if (isEmptyState(server) && !isEmptyState(cached)) {
        pending = cached
        scheduleFlush(50)
        return cached
      }
      writeCache(server)
      saveMeta({ updated_at: lastServerAt, dirty: false })
      setStatus('synced')
      return server
    },

    /** Mark a new state as the latest local truth and schedule a save. */
    save: (state) => {
      writeCache(state)
      saveMeta({ updated_at: lastServerAt, dirty: true })
      pending = state
      scheduleFlush()
    },

    /** Force flush right now (e.g. on visibility change). */
    flushNow: () => flush(),

    /** Re-pull server state (e.g. when coming back online). */
    refresh: async () => {
      try {
        const fresh = await fetchServer()
        lastServerAt = fresh.updated_at || 0
        saveMeta({ updated_at: lastServerAt, dirty: !!pending })
        const server = merge(fresh.data)
        if (!pending) {
          writeCache(server)
          onRemoteState && onRemoteState(server, 'pull')
          setStatus('synced')
        }
        return server
      } catch (e) {
        if (e.code === 'unauthorized') {
          setStatus('error')
          onAuthRequired && onAuthRequired()
        } else {
          setStatus(navigator.onLine ? 'error' : 'offline')
        }
      }
    }
  }
}

// Field-level merge: union of sessions (latest ts per exercise wins),
// prefs from `b` (the local edit) win.
function mergeStates(a, b) {
  const out = { prefs: { ...a.prefs, ...b.prefs }, sessions: { ...a.sessions } }
  for (const [k, vB] of Object.entries(b.sessions || {})) {
    const vA = out.sessions[k]
    if (!vA) { out.sessions[k] = vB; continue }
    const logs = { ...vA.logs }
    for (const [name, lB] of Object.entries(vB.logs || {})) {
      const lA = logs[name]
      if (!lA || (lB.ts || 0) >= (lA.ts || 0)) logs[name] = lB
    }
    out.sessions[k] = { ...vA, ...vB, logs }
  }
  return out
}
