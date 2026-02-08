if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config')
}
if (!process.env.REDIS_HOST) {
  throw new Error('Missing REDIS_HOST')
}
if (!process.env.MONGO_DB_URL) {
  throw new Error('Missing MONGO_DB_URL')
}
