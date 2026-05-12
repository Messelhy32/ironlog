// Thin REST client for the Node API. Bearer token from localStorage; surfaces
// 401 to a global handler that drops the user back to the login screen.

const TOKEN_KEY = 'ironlog.v2.token'

export const apiBase = () => {
  const url = import.meta.env.VITE_API_URL || ''
  return url.replace(/\/+$/, '')
}

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export const setToken = (v) => {
  try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY) } catch {}
}
export const clearToken = () => setToken('')

let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `HTTP ${status}`)
    this.status = status; this.body = body
  }
}
export { ApiError }

async function request(method, path, body) {
  const token = getToken()
  const headers = { 'content-type': 'application/json', accept: 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const r = await fetch(apiBase() + path, opts)
  if (r.status === 204) return null
  const text = await r.text()
  const parsed = text ? safeParse(text) : null
  if (!r.ok) {
    if (r.status === 401) {
      clearToken()
      onUnauthorized && onUnauthorized()
    }
    throw new ApiError(r.status, parsed)
  }
  return parsed
}

const safeParse = (s) => { try { return JSON.parse(s) } catch { return s } }

// ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: ({ username, password }) =>
      request('POST', '/api/login', { username, password }),
    logout: () => request('POST', '/api/logout'),
    me: () => request('GET', '/api/me'),
    updateProfile: (patch) => request('PATCH', '/api/me/profile', patch),
    changePassword: ({ current, next }) =>
      request('PATCH', '/api/me/password', { current, next })
  },
  programs: {
    list: () => request('GET', '/api/programs'),
    get: (id) => request('GET', `/api/programs/${id}`),
    reset: (id) => request('POST', `/api/programs/${id}/reset`)
  },
  groups: {
    create: ({ dayId, name, position }) =>
      request('POST', '/api/groups', { dayId, name, position }),
    update: (id, patch) => request('PATCH', `/api/groups/${id}`, patch),
    remove: (id) => request('DELETE', `/api/groups/${id}`)
  },
  exercises: {
    create: (body) => request('POST', '/api/exercises', body),
    update: (id, patch) => request('PATCH', `/api/exercises/${id}`, patch),
    remove: (id) => request('DELETE', `/api/exercises/${id}`)
  },
  sessions: {
    byDate: (date) => request('GET', `/api/sessions?date=${encodeURIComponent(date)}`),
    history: ({ limit = 50, offset = 0 } = {}) =>
      request('GET', `/api/sessions/history?limit=${limit}&offset=${offset}`),
    resetDay: ({ date, dayId }) => request('DELETE', '/api/sessions', { date, dayId })
  },
  logs: {
    upsert: ({ date, dayId, exerciseName, done, weightKg }) =>
      request('PUT', '/api/logs', { date, dayId, exerciseName, done, weightKg }),
    remove: ({ date, dayId, exerciseName }) =>
      request('DELETE', '/api/logs', { date, dayId, exerciseName })
  },
  prs: {
    list: () => request('GET', '/api/prs')
  },
  shield: {
    get: () => request('GET', '/api/shield'),
    logsByDate: (date) =>
      request('GET', `/api/shield/logs?date=${encodeURIComponent(date)}`),
    upsertLog: ({ date, itemId, done }) =>
      request('PUT', '/api/shield/logs', { date, itemId, done })
  }
}
