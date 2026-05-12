// Late-bound: the Socket.io server is attached by realtime/socket.js after
// the http server is created. broadcast() is safe to call before that — it
// just no-ops until io is set.

let ioRef = null

export const setIo = (io) => { ioRef = io }

export const broadcast = (userId, event, payload) => {
  if (!ioRef) return
  ioRef.to(`u:${String(userId)}`).emit(event, payload)
}
