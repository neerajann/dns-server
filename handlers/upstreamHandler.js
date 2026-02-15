import { cacheRRsets } from '../services/cacheService.js'
import dnsPacket from 'dns-packet'

/**
 * Handles DNS responses from upstream server and forwards them back to the original client
 * Caches the response records before forwarding
 *
 * @param {Object} params
 * @param {Buffer} params.response - Raw DNS response message from upstream server
 * @param {Object} params.server - UDP server instance to send response back to client
 * @param {Map} params.pendingRequests - Map of pending requests keyed by DNS query ID
 */
const handleUpstreamResponse = async ({
  response,
  server,
  pendingRequests,
}) => {
  const decoded = dnsPacket.decode(response)
  // Cache the DNS records for future queries
  await cacheRRsets(decoded.answers)

  // Look up the original client who made this request
  const request = pendingRequests.get(decoded.id)
  if (!request) return
  // Forward the upstream response back to the original client
  server.send(response, request.port, request.address)

  // Clean up the pending request
  pendingRequests.delete(decoded.id)
}

export { handleUpstreamResponse }
