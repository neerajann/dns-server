# Custom DNS Server

A high-performance, caching DNS server with blocklist support built on Node.js. Features intelligent query routing, Redis caching, and MongoDB-backed configuration for custom DNS records and domain blocking.

## Features

- **Fast Response Times**: Redis caching for frequently queried domains
- **Domain Blocking**: MongoDB-based blocklist for ad/malware blocking
- **Upstream Forwarding**: Falls back to public DNS servers (Cloudflare, Google DNS) for unknown queries
- **Custom Records**: Support for A, AAAA, PTR, MX, TXT, CNAME records
- **In-Memory Blocklist**: O(1) lookup performance for blocked domains loaded in memory from MongoDB

## Architecture

```
        [ Client Query ]
                 │
                 ▼
       ┌───────────────────┐
       │    DNS SERVER     │◄─── [ Blocklist Cache ]
       └─────────┬─────────┘
                 │
         (1) Is Blocked? ─────────► YES: Return DNS Sinkhole (0.0.0.0)
                 │
          (2) NO: Check Redis
                 │
        ┌────────┴────────┐
        │  Cache Hit?     ├───────► YES: Return Record
        └────────┬────────┘
                 │
          (3) CACHE MISS
                 │
        ┌────────┴────────┐
        │ Check MongoDB   ├───────► FOUND: Return Local Record (skip cache to prevent stale response and eliminate cache invalidation)
        └────────┬────────┘
                 │
          (4) NOT FOUND
                 │
        ┌────────┴────────┐
        │ Upstream DNS    │
        └────────┬────────┘
                 │
                 ▼
     ┌─────────────────────────┐
     │ 1. Update redis Cache   │
     │ 2. Return to Client     │
     └─────────────────────────┘
```

## Prerequisites

- Docker
- Docker Compose

**Note for Windows Users**: Port 53 is often used by Windows DNS services, which may cause conflicts. If you ran into port already used issue, you can run the DNS server on a different port (e.g., 5353) or use WSL2 for a better experience.

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/neerajann/dns-server.git
cd dns-server
```

2. Start all services:

```bash
docker-compose up -d
```

3. Test the DNS server:

```bash
dig @localhost example.com
```

### Development Mode

To run in development mode with auto-reload:

```bash
npm install
npm run dev
```

Make sure MongoDB and Redis are running locally update `.env` with your connection strings.

## Managing DNS Records

### Add DNS Records

1. Open Mongo Express at `http://localhost:8081`
2. Select the `dns` database
3. Go to `records` collection
4. Click "New Document"
5. Add your record:

**Simple A Record:**

```json
{
  "name": "myapp.local",
  "records": [
    {
      "type": "A",
      "content": ["192.168.1.100"]
    }
  ]
}
```

**Multiple Record Types:**

```json
{
  "name": "nodepost.home",
  "records": [
    {
      "type": "A",
      "content": ["192.168.16.50"]
    },
    {
      "type": "AAAA",
      "content": ["fe80::b834:fcfd:35e:bd6c%10"]
    },
    {
      "type": "MX",
      "content": [
        {
          "exchange": "mail.nodepost.home",
          "preference": 10
        }
      ]
    },
    {
      "type": "TXT",
      "content": ["v=spf1 ip4:192.168.16.51 ~all"]
    }
  ]
}
```

### Add to Blocklist

1. Open Mongo Express at `http://localhost:8081`
2. Select the `dns` database
3. Go to `blocklist` collection
4. Click "New Document"
5. Add domain to block:

```json
{
  "name": "ads.example.com"
}
```

**Important:** After adding to the blocklist, restart the DNS server to reload:

```bash
docker-compose restart dns-server
```

## Supported Record Types

| Type  | Description    | Content Format                                     |
| ----- | -------------- | -------------------------------------------------- |
| A     | IPv4 address   | `["192.168.1.1"]`                                  |
| AAAA  | IPv6 address   | `["2001:db8::1"]`                                  |
| CNAME | Canonical name | `["alias.example.com"]`                            |
| MX    | Mail exchange  | `[{exchange: "mail.example.com", preference: 10}]` |
| TXT   | Text record    | `["v=spf1 include:_spf.example.com ~all"]`         |
| PTR   | Reverse DNS    | Automatically handled via A record lookup          |

**Note**: The `content` field is always an array, even for single values.

## Testing Your DNS Server

### Using dig (Linux/macOS/WSL)

```bash
# Query A record
dig @localhost nodepost.home

# Query MX record
dig @localhost nodepost.home MX

# Query TXT record
dig @localhost nodepost.home TXT
```

### Using PowerShell (Windows)

```powershell
# Query A record
Resolve-DnsName -Name nodepost.home -Server localhost -Type A

# Query MX record
Resolve-DnsName -Name nodepost.home -Server localhost -Type MX

# Query TXT record
Resolve-DnsName -Name nodepost.home -Server localhost -Type TXT
```

## Docker Services

The `docker-compose.yml` includes:

- **DNS Server**: Main application (port 53)
- **MongoDB**: Database for records and blocklist (port 27017)
- **Mongo Express**: Web UI for MongoDB (port 8081)
- **Redis**: Cache layer (port 6379)

### Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f dns-server

# Stop all services
docker-compose down

# Restart DNS server
docker-compose restart dns-server
```

## Configuration

### Upstream DNS Servers

Modify `config/constant.js` to change upstream DNS providers:

```javascript
export const UPSTREAM_DNS = [
  { address: '1.1.1.1', port: 53 }, // Cloudflare DNS
  { address: '8.8.8.8', port: 53 }, // Google DNS
]
```

## Use Cases

- **Home Lab DNS**: Manage custom domains for your home network and internal services
- **Development Environment**: Local DNS for microservices, testing, and dev workflows
- **Ad Blocking**: Block advertising and tracking domains network-wide
- **Mail Server Setup**: Configure MX, SPF, and DKIM records for email infrastructure
- **Network Filtering**: Control domain access and implement parental controls
- **Performance Optimization**: Cache frequently accessed DNS records for faster resolution
- **Custom CDN/Load Balancing**: Route traffic to specific servers based on domain names
- **IoT Device Management**: Assign friendly domain names to IoT devices on your network
- **Privacy Enhancement**: Prevent DNS queries from leaking to ISP by using your own resolver
- **Local Service Discovery**: Enable easy access to local services without remembering IP addresses
- **Testing DNS Changes**: Test DNS configurations before deploying to production

## Author

**Nirajan Paudel**

- LinkedIn: www.linkedin.com/in/nirajan-paudel-a9b052265
- GitHub: https://github.com/neerajann

---
