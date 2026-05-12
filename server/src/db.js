import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

let connectPromise = null

export async function connect() {
  if (!connectPromise) {
    connectPromise = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000
    })
  }
  return connectPromise
}

export { mongoose }
