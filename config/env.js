import dotenv from 'dotenv'
dotenv.config({ quiet: true })

if (!process.env.REDIS_HOST) {
  throw new Error('Missing REDIS_HOST')
}
if (!process.env.MONGO_DB_URL) {
  throw new Error('Missing MONGO_DB_URL')
}
