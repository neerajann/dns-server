import dnsPacket from 'dns-packet'
import { isBlocked } from '../services/blocklistService.js'
import { resolveRRset } from '../services/cacheService.js'
import { findRecord } from '../services/recordService.js'
import { sendResponse } from '../services/responseService.js'
import { forwardToUpStream } from '../services/forwardToUpstream.js'

/**
 * Main DNS query handler - processes incoming DNS queries through multiple resolution layers
 * Resolution order: Blocklist → MongoDB → Redis Cache → Upstream DNS
 *
 * @param {Object} params
 * @param {Buffer} params.msg - Raw DNS query message
 * @param {Object} params.rinfo - Client address info (port, address)
 * @param {Object} params.server - UDP server to send responses
 * @param {Object} params.upstream - UDP socket for upstream queries
 * @param {Map} params.pendingRequests - Tracks pending upstream requests
 */
const handleQuery = async ({
  msg,
  rinfo,
  server,
  upstream,
  pendingRequests,
}) => {
  try {
    const incomingMessage = dnsPacket.decode(msg)

    console.log(
      'Message From:',
      rinfo.address,
      'Questions:',
      incomingMessage.questions[0].name,
      'Type:',
      incomingMessage.questions[0].type,
    )

    const question = incomingMessage.questions[0]
    // Priority 1: Check if domain is blocked
    if (isBlocked(question.name)) {
      return sendResponse({
        server,
        incomingMessage,
        rinfo,
        rrset: {
          records: {
            content: ['0.0.0.0'], // Return null route for blocked domains
          },
        },
      })
    }

    // Priority 2: Check Redis cache for previously resolved records
    const rrset = await resolveRRset({
      name: question.name,
      type: question.type,
    })

    if (rrset) {
      return sendResponse({
        server,
        incomingMessage,
        rinfo,
        rrset,
      })
    }

    // Priority 3: Check MongoDB for custom records
    const recordFromDB = await findRecord({
      name: question.name,
      type: question.type,
    })

    if (recordFromDB) {
      // Database-sourced records are served directly (no caching) to provide real-time updates and avoid stale DNS responses.
      return sendResponse({
        server,
        incomingMessage,
        rinfo,
        rrset: recordFromDB,
      })
    }

    // Priority 4: Forward to upstream DNS server (Cloudflare, Google DNS, etc.)
    return await forwardToUpStream({ msg, rinfo, pendingRequests, upstream })
  } catch (error) {
    console.log(error)
  }
}
export { handleQuery }
