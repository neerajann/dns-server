import { MongoClient } from 'mongodb'
import { styleText } from 'node:util'
let client
let db

const connectDatabase = async () => {
  client = new MongoClient(process.env.MONGO_DB_URL)
  await client.connect()
  db = client.db('dns') // DNS record database
  console.log(styleText('green', '[MongoDB] connected'))
  return db
}

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase first.')
  }
  return db
}

const getRecordsCollection = () => {
  return getDatabase().collection('records') // DNS record collection
}

const getBlocklistCollection = () => {
  return getDatabase().collection('blocklist') // Blocked domains collection
}

export {
  connectDatabase,
  getDatabase,
  getRecordsCollection,
  getBlocklistCollection,
}
