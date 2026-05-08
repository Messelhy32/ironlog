// localStorage helpers — single key for everything to make backup trivial.

const KEY = 'ironlog.v1'

const empty = () => ({
  prefs: { theme: 'dark', units: 'kg', selectedDay: null },
  // sessions: { 'YYYY-MM-DD': { day: 'D1', logs: { 'Exercise Name': { weight, done, ts } | { done, ts } } } }
  sessions: {}
})

export function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw)
    return { ...empty(), ...parsed, prefs: { ...empty().prefs, ...(parsed.prefs || {}) } }
  } catch {
    return empty()
  }
}

export function saveAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function exportBackup(data) {
  const json = JSON.stringify(data)
  // browser-safe base64 for unicode strings
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return `IRONLOG:${b64}`
}

export function importBackup(text) {
  const trimmed = String(text || '').trim()
  const payload = trimmed.startsWith('IRONLOG:') ? trimmed.slice('IRONLOG:'.length) : trimmed
  try {
    const json = decodeURIComponent(escape(atob(payload)))
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid')
    return parsed
  } catch (e) {
    throw new Error('Invalid backup string')
  }
}
