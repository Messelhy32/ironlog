import { Server } from 'socket.io'
import { AuthToken } from '../models/AuthToken.js'
import { env } from '../env.js'
import { setIo } from './broadcast.js'

export const attachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
      || (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return next(new Error('unauthorized'))
    const row = await AuthToken.findOne({ token }).lean()
    if (!row) return next(new Error('unauthorized'))
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return next(new Error('expired'))
    socket.data.userId = String(row.userId)
    next()
  })

  io.on('connection', (socket) => {
    const uid = socket.data.userId
    if (uid) socket.join(`u:${uid}`)
  })

  setIo(io)
  return io
}
