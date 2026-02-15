import dnsPacket from 'dns-packet'
import { UPSTREAM_DNS } from '../config/constant.js'

const forwardToUpStream = async ({ msg, rinfo, pendingRequests, upstream }) => {
  const decoded = dnsPacket.decode(msg)
  pendingRequests.set(decoded.id, {
    address: rinfo.address,
    port: rinfo.port,
    upstreamIndex: 0,
    attempts: 0,
  })

  const upstreamServer = UPSTREAM_DNS[0]
  upstream.send(msg, upstreamServer.port, upstreamServer.address)

  setTimeout(() => {
    const request = pendingRequests.get(decoded.id)
    if (!request) return

    request.attempts++
    request.upstreamIndex++

    if (request.upstreamIndex < UPSTREAM_DNS.length) {
      const nextUpstream = UPSTREAM_DNS[request.upstreamIndex]
      upstream.send(msg, nextUpstream.port, nextUpstream.address)
    }
  }, UPSTREAM_TIMEOUT)
}

export { forwardToUpStream }
