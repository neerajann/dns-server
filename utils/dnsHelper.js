/**
 * Extracts the IP address from a reverse DNS (PTR) query domain name
 * Converts from reverse format to standard dotted notation
 *
 * @param {string} name - PTR query domain (e.g., "4.3.2.1.in-addr.arpa")
 * @returns {string|null} IP address in standard format (e.g., "1.2.3.4"), or null if invalid
 */
const parsePTRQuery = (name) => {
  const suffix = '.in-addr.arpa'
  if (!name.endsWith(suffix)) {
    return null
  }

  // Extract and split the IP octets (reversed in PTR format)
  const labels = name.slice(0, -suffix.length).split('.')
  if (labels.length !== 4) return null

  // Reverse to get correct IP order
  const octets = labels.reverse()

  // Validate each octet is a valid IP number (0-255)
  for (const o of octets) {
    const n = Number(o)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
  }
  return octets.join('.')
}

export { parsePTRQuery }
