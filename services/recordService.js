import { getRecordsCollection } from '../config/mongo.js'
import { parsePTRQuery } from '../utils/dnsHelper.js'

const findRecord = async ({ name, type }) => {
  const records = getRecordsCollection()
  if (type === 'PTR') {
    const ipAddress = parsePTRQuery(name)
    if (!ipAddress) return null
    const result = await records.findOne(
      {
        'records.type': 'A',
        'records.content': ipAddress,
      },
      {
        projection: {
          name: 1,
          _id: 0,
        },
      },
    )
    if (!result) return null
    return {
      records: [
        {
          content: result.name,
        },
      ],
    }
  }

  const result = await records.findOne(
    {
      name: name,
      'records.type': type,
    },
    {
      projection: {
        records: {
          $elemMatch: { type },
        },
        _id: 0,
      },
    },
  )

  if (!result || !result?.records?.length) return null
  return { records: result.records[0] }
}
export { findRecord }
