import dnsPacket from 'dns-packet'
import { UPSTREAM_DNS } from '../config/constant.js'

/**
 * Forwards a DNS query to an upstream DNS server (e.g Cloudflare)
 * Stores the original client info to route the response back later
 *
 * @param {Object} params
 * @param {Buffer} params.msg - Raw DNS query message buffer
 * @param {Object} params.rinfo - Original client's address info (port, address)
 * @param {Map} params.pendingRequests - Map to track pending requests by DNS query ID
 * @param {Object} params.upstream - UDP socket to send upstream queries
 */
const UPSTREAM_TIMEOUT = 2000
const forwardToUpStream = async ({ msg, rinfo, pendingRequests, upstream }) => {
  const decoded = dnsPacket.decode(msg)

  // Store client info keyed by query ID so we can route the upstream response back to them
  pendingRequests.set(decoded.id, {
    address: rinfo.address,
    port: rinfo.port,
    upstreamIndex: 0,
    attempts: 0,
  })

  // Try first upstream server
  const upstreamServer = UPSTREAM_DNS[0]
  upstream.send(msg, upstreamServer.port, upstreamServer.address)

  // Set timeout to retry with next upstream if no response
  setTimeout(() => {
    const request = pendingRequests.get(decoded.id)
    if (!request) return // Already got response

    request.attempts++
    request.upstreamIndex++

    // Try next upstream server if available
    if (request.upstreamIndex < UPSTREAM_DNS.length) {
      const nextUpstream = UPSTREAM_DNS[request.upstreamIndex]
      upstream.send(msg, nextUpstream.port, nextUpstream.address)
    }
  }, UPSTREAM_TIMEOUT)
}

export { forwardToUpStream }
