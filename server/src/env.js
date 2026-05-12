import 'dotenv/config'

const required = (k) => {
  const v = process.env[k]
  if (!v) throw new Error(`Missing required env: ${k}`)
  return v
}

export const env = {
  PORT: Number(process.env.PORT || 8787),
  MONGODB_URI: required('MONGODB_URI'),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',').map(s => s.trim()).filter(Boolean),
  TOKEN_TTL_DAYS: Number(process.env.TOKEN_TTL_DAYS || 30),
  SEED_ON_START: process.env.SEED_ON_START === 'true',
  SEED_USERNAME: process.env.SEED_USERNAME || 'me',
  SEED_PASSWORD: process.env.SEED_PASSWORD || '1307'
}
