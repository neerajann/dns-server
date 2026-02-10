import Redis from 'ioredis'
import { styleText } from 'node:util'

let redis
const REDIS_PORT = process.env.REDIS_PORT || 6379

const connectRedis = async () => {
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: REDIS_PORT,
    connectTimeout: 5000,
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      return Math.min(times * 1000, 10000)
    },
  })

  redis.on('error', (err) => {
    console.error(styleText('red', `[Redis error]', ${err.message}`))
  })

  redis.on('connect', () => {
    console.log(styleText('green', '[Redis] connected'))
  })

  redis.on('close', () => {
    console.warn('[Redis] connection closed')
  })

  redis.on('reconnecting', () => {
    console.warn('[Redis] reconnecting...')
  })
  return redis
}

const getRedis = () => {
  if (!redis) {
    throw new Error('Redis not initialized. Call connectRedis first.')
  }
  return redis
}

export { connectRedis, getRedis }
