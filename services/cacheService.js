import { getRedis } from '../config/redis.js'

/**
 * Resolves a DNS record from Redis cache, following CNAME chains if necessary
 * @param {Object} params
 * @param {string} params.name - Domain name to resolve
 * @param {string} params.type - DNS record type (A, AAAA, MX, TXT, etc.)
 * @returns {Promise<Object|null>} Record set with type, TTL, and content array, or null if not cached
 */

const resolveRRset = async ({ name, type }) => {
  const cache = getRedis()
  const rrsetStr = await cache.get(`${name}:${type}`)

  if (rrsetStr) {
    const rrset = JSON.parse(rrsetStr)
    return {
      records: {
        type: type,
        ttl: rrset.ttl,
        content: rrset?.data?.map((data) => {
          let content = data
          // Reconstruct Buffer objects that were serialized to JSON
          // JSON.stringify converts Buffers to {type: 'Buffer', data: [bytes...]}
          if (
            data &&
            typeof data === 'object' &&
            data.type === 'Buffer' &&
            Array.isArray(data.data)
          ) {
            content = Buffer.from(data.data)
          } else if (
            Array.isArray(data) &&
            data[0] &&
            typeof data[0] === 'object' &&
            data[0].type === 'Buffer' &&
            Array.isArray(data[0].data)
          ) {
            content = Buffer.from(data[0].data)
          }

          return content
        }),
      },
    }
  }
  // If no direct match, check for CNAME and recursively resolve the canonical name
  const cnameStr = await cache.get(`${name}:CNAME`)
  if (cnameStr) {
    const cname = JSON.parse(cnameStr)
    return resolveRRset({ name: cname, type })
  }
  return null
}

/**
 * Caches DNS answers in Redis with TTL-based expiration
 * Groups multiple records by domain:type and uses the minimum TTL
 * @param {Array} answers - Array of DNS answer records from upstream resolver
 */

const cacheRRsets = async (answers) => {
  const cache = getRedis()
  const rrsets = {}

  // Group records by domain:type key and track minimum TTL
  for (const rr of answers) {
    const key = `${rr.name}:${rr.type}`
    if (!rrsets[key]) rrsets[key] = { ttl: rr.ttl, data: [] }
    rrsets[key].ttl = Math.min(rrsets[key].ttl, rr.ttl)
    rrsets[key].data.push(rr.data)
  }

  // Store each record set in Redis with TTL expiration
  for (const [key, rrset] of Object.entries(rrsets)) {
    const ttl = Math.min(
      ...answers.filter((r) => `${r.name}:${r.type}` === key).map((r) => r.ttl),
    )
    // Only cache if TTL is positive
    if (ttl > 0) {
      await cache.set(
        key,
        JSON.stringify({ data: rrset.data, ttl: rrset.ttl }),
        'EX',
        ttl,
      )
    }
  }
}
export { resolveRRset, cacheRRsets }
