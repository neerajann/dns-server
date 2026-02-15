import dnsPacket from 'dns-packet'

/**
 * Builds DNS answer records based on query type and content
 * @param {Object} questions - The DNS question from the query
 * @param {string} qtype - Query type (A, PTR, MX, TXT, etc.)
 * @param {Object} rrset - Resource record set containing records and TTL
 * @returns {Array} Array of DNS answer objects
 */

const buildAnswers = (questions, qtype, rrset) => {
  const ttl = rrset.records.ttl || 50

  if (qtype === 'MX') {
    return rrset.records.content.map((r) => ({
      name: questions.name,
      type: 'MX',
      class: 'IN',
      ttl: ttl,
      data: {
        preference: r.preference ?? 10, // For missing preference
        exchange: r.exchange,
      },
    }))
  }

  if (qtype === 'TXT') {
    return rrset.records.content.map((r) => {
      let txtData = r
      if (!Array.isArray(txtData)) txtData = [txtData]

      // TXT records have a 255-byte limit per string, so split longer strings
      const splitData = []
      for (const str of txtData) {
        if (Buffer.byteLength(str) <= 255) {
          splitData.push(str)
        } else {
          // Split strings longer than 255 bytes into chunks
          for (let i = 0; i < str.length; i += 255) {
            splitData.push(str.substring(i, i + 255))
          }
        }
      }
      return {
        name: questions.name,
        type: 'TXT',
        class: 'IN',
        ttl: ttl,
        data: splitData,
      }
    })
  }

  // Default handler for A, AAAA, MX,CNAME, PTR, Blocked and other record types
  return rrset.records.content.map((r) => ({
    name: questions.name,
    type: qtype,
    class: 'IN',
    ttl: ttl,
    data: r,
  }))
}

/**
 * Encodes and sends a DNS response back to the client
 * @param {Object} params
 * @param {Object} params.server - UDP server instance
 * @param {Object} params.incomingMessage - Parsed DNS query message
 * @param {Object} params.rinfo - Remote address info (port, address)
 * @param {Object} params.rrset - Resource record set to include in response
 */

const sendResponse = ({ server, incomingMessage, rinfo, rrset }) => {
  const questions = incomingMessage.questions[0]
  const qtype = questions.type
  try {
    const answers = buildAnswers(questions, qtype, rrset)

    const response = dnsPacket.encode({
      id: incomingMessage.id,
      type: 'response',
      flags: dnsPacket.AUTHORITATIVE_ANSWER,
      questions: [questions],
      answers,
    })

    server.send(response, rinfo.port, rinfo.address)
  } catch (error) {
    // Log error details for debugging
    console.error('Error encoding DNS response:', error)
    console.error('Question:', questions)
    console.error('RRset:', JSON.stringify(rrset, null, 2))

    // Send SERVFAIL response to client
    const errorResponse = dnsPacket.encode({
      id: incomingMessage.id,
      type: 'response',
      flags: dnsPacket.SERVFAIL,
      questions: [questions],
      answers: [],
    })
    server.send(errorResponse, rinfo.port, rinfo.address)
  }
}

export { sendResponse }
