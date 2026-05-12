import http from 'node:http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './env.js'
import { connect } from './db.js'
import authRoutes from './auth/routes.js'
import programsRoutes from './routes/programs.js'
import groupsRoutes from './routes/groups.js'
import exercisesRoutes from './routes/exercises.js'
import sessionsRoutes from './routes/sessions.js'
import logsRoutes from './routes/logs.js'
import prsRoutes from './routes/prs.js'
import shieldRoutes from './routes/shield.js'
import { attachSocket } from './realtime/socket.js'
import { seed } from './seed.js'

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / curl (no Origin header) and the configured allowlist.
    if (!origin) return cb(null, true)
    cb(null, env.CORS_ORIGINS.includes(origin))
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}))
app.use(express.json({ limit: '128kb' }))

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

app.use('/api', authRoutes)
app.use('/api/programs', programsRoutes)
app.use('/api/groups', groupsRoutes)
app.use('/api/exercises', exercisesRoutes)
app.use('/api/sessions', sessionsRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/prs', prsRoutes)
app.use('/api/shield', shieldRoutes)

app.use((err, _req, res, _next) => {
  console.error('[error]', err)
  res.status(500).json({ error: 'internal' })
})

const httpServer = http.createServer(app)
attachSocket(httpServer)

const start = async () => {
  try {
    await connect()
    console.log('[db] connected')
    if (env.SEED_ON_START) {
      await seed()
      console.log('[seed] complete (SEED_ON_START)')
    }
    httpServer.listen(env.PORT, () => {
      console.log(`[server] listening on :${env.PORT}`)
    })
  } catch (err) {
    console.error('[startup] failed:', err)
    process.exit(1)
  }
}

start()
