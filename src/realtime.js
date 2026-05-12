import { io } from 'socket.io-client'
import { apiBase, getToken } from './api.js'
import { realtime } from './store.js'

let socket = null

export function connectRealtime() {
  if (socket && socket.connected) return socket
  if (socket) socket.disconnect()

  const token = getToken()
  if (!token) return null

  socket = io(apiBase() || window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500
  })

  socket.on('connect', () => console.log('[rt] connected'))
  socket.on('connect_error', (e) => console.warn('[rt] connect_error', e.message))
  socket.on('disconnect', () => console.log('[rt] disconnected'))

  socket.on('log:upserted', (p) => realtime.onLogUpserted(p))
  socket.on('log:deleted', (p) => realtime.onLogDeleted(p))
  socket.on('session:reset', (p) => realtime.onSessionReset(p))
  socket.on('exercise:created', (p) => realtime.onExerciseCreated(p))
  socket.on('exercise:updated', (p) => realtime.onExerciseUpdated(p))
  socket.on('exercise:deleted', (p) => realtime.onExerciseDeleted(p))
  socket.on('group:created', (p) => realtime.onGroupCreated(p))
  socket.on('group:updated', (p) => realtime.onGroupUpdated(p))
  socket.on('group:deleted', (p) => realtime.onGroupDeleted(p))
  socket.on('program:reset', (p) => realtime.onProgramReset(p))
  socket.on('shield:log:upserted', (p) => realtime.onShieldLogUpserted(p))

  return socket
}

export function disconnectRealtime() {
  if (socket) { socket.disconnect(); socket = null }
}
