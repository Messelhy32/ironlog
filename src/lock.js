// Local PIN + session-unlock helpers. The PIN never goes to the server —
// it gates access to the stored bearer token on each fresh app open.

const PIN_KEY = 'ironlog.v2.pin'
const SESSION_KEY = 'ironlog.v2.unlocked'

export const getPin = () => {
  try { return localStorage.getItem(PIN_KEY) || '' } catch { return '' }
}
export const setPin = (v) => {
  try { v ? localStorage.setItem(PIN_KEY, String(v)) : localStorage.removeItem(PIN_KEY) } catch {}
}
export const clearPin = () => setPin('')
export const hasPin = () => !!getPin()

export const isUnlocked = () => {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}
export const markUnlocked = () => {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
}
export const lockSession = () => {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}
