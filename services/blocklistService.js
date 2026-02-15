import { getBlocklistCollection } from '../config/mongo.js'
import { styleText } from 'node:util'

// In-memory set for fast O(1) domain blocking lookups
const blockedDomains = new Set()

/**
 * Loads blocked domains from MongoDB into memory for fast lookup
 * Should be called on server startup and when blocklist is updated
 */
const loadBlockList = async () => {
  const blockedCollection = getBlocklistCollection()

  const docs = await blockedCollection
    .find({}, { projection: { name: 1 } })
    .toArray()
  blockedDomains.clear()
  for (const doc of docs) {
    blockedDomains.add(doc.name)
  }
  console.log(
    styleText('green', `Loaded ${blockedDomains.size} blocked domains`),
  )
}

/**
 * Checks if a domain is in the blocklist
 * @param {string} domain - Domain name to check
 * @returns {boolean} True if domain is blocked
 */
const isBlocked = (domain) => {
  return blockedDomains.has(domain)
}

export { loadBlockList, isBlocked }
