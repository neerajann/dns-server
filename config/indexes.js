import { getRecordsCollection, getBlocklistCollection } from './mongo.js'
import { styleText } from 'node:util'

/**
 * Creates necessary indexes for optimal query performance
 * Should be called once on application startup
 */
const createIndexes = async () => {
  try {
    const records = getRecordsCollection()
    const blocklist = getBlocklistCollection()

    // Index for finding records by name and type (most common query)
    await records.createIndex({ name: 1, 'records.type': 1 })

    // Index for PTR queries (reverse lookup by IP)
    await records.createIndex({ 'records.type': 1, 'records.content': 1 })

    // Index for blocklist lookups (unique domain names)
    await blocklist.createIndex({ name: 1 }, { unique: true })

    console.log(styleText('green', 'Database indexes created successfully'))
  } catch (error) {
    // Code 85 = IndexOptionsConflict
    if (error.code !== 85) {
      console.error('Error creating indexes:', error)
    }
  }
}

export { createIndexes }
