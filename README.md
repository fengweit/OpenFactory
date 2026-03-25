# OpenFactory

> What Stripe did for payments, OpenFactory does for manufacturing.

### Lio-Ready Integration

```typescript
const capacity = await lio.call("query_live_capacity", { category: "pcb_assembly", quantity: 1000 });  // 10ms
const quote    = await lio.call("get_instant_quote", { factory_id: "sz-006", category: "pcb_assembly", quantity: 1000 });  // 36ms
const order    = await lio.call("place_order", { quote_id: quote.quote_id, buyer_id: "buyer-001" });  // 48ms
```

Real-time manufacturing capacity as an API. Sub-50ms quote-to-order.

[![npm](https://img.shields.io/badge/npx-openfactory--mcp-purple)](https://www.npmjs.com/package/openfactory-mcp)
[![GitHub stars](https://img.shields.io/github/stars/fengweit/OpenFactory)](https://github.com/fengweit/OpenFactory)
[![Lio-Ready](https://img.shields.io/badge/lio--ready-✓-green)](/lio-ready.html)

---

## MCP Tools (8)

| Tool | Description |
|------|-------------|
| `search_factories` | Filter 10+ verified GBA factories by category, MOQ, price tier, rating |
| `get_quote` | Request price quote — returns unit price, total, lead time, 7-day valid quote_id |
| `get_instant_quote` | Sub-second binding quote from pre-declared pricing rules. No waiting. Valid 48h |
| `query_live_capacity` | Real-time capacity across all factories — instant pricing, lead times, confidence scores |
| `place_order` | Create escrow-protected order from accepted quote |
| `track_order` | Production status + full event history (placed → confirmed → production → QC → shipped → delivered) |
| `update_order_status` | Advance production milestone (factory-side) |
| `get_analytics` | Platform analytics: GMV, quote volume, factory performance |

## REST API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/factories` | — | Search factories (category, max_moq, price_tier, verified_only) |
| GET | `/factories/:id/quotes` | — | Quotes received by factory |
| GET | `/factories/:id/orders` | — | Orders placed with factory |
| GET | `/factories/:id/instant-quote` | — | Sub-second binding quote |
| GET | `/factories/:id/capacity` | — | Current declared capacity |
| GET | `/factories/:id/pricing-rules` | — | Factory pricing rules |
| PATCH | `/factories/:id/capacity` | — | Update declared capacity |
| PATCH | `/factories/:id/pricing-rules` | — | Upsert pricing rules |
| GET | `/capacity` | — | Live capacity query across all factories |
| POST | `/quotes` | — | Request quote from factory |
| POST | `/quotes/:id/respond` | — | Factory responds with price |
| POST | `/orders` | JWT | Place escrow-protected order |
| GET | `/orders/:id` | — | Track order status + events |
| PATCH | `/orders/:id/status` | — | Update production milestone |
| POST | `/auth/register` | — | Register buyer/factory |
| POST | `/auth/login` | — | Login, get JWT |
| POST | `/onboard` | — | Submit factory application |
| GET | `/admin/applications` | — | List factory applications |
| GET | `/analytics` | — | Platform analytics |
| POST | `/test/notify` | — | Test WeChat webhook |

Full API reference: [docs/API.md](./docs/API.md)

Rate limit: 100 req/min per IP.

## Quick Start

```bash
npm install
npm run api      # REST API + UI at http://localhost:3000
npm run mcp      # MCP server (stdio transport)
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "openfactory": {
      "command": "npx",
      "args": ["tsx", "/path/to/OpenFactory/src/mcp/server.ts"]
    }
  }
}
```

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/buyer.html` | Buyer flow — Search → RFQ → Compare → Order → Track |
| `/portal.html` | Factory portal — Dashboard, Quotes, Orders, Profile |
| `/factory-mobile.html` | Mobile factory dashboard (WeChat quick-reply target) |
| `/agent.html` | AI Agent demo — live MCP tool calls |
| `/admin.html` | Admin dashboard — analytics |
| `/onboard.html` | Factory onboarding — 4-step application |
| `/lio-ready.html` | Lio integration showcase |

## Tech Stack

- **Runtime:** Node.js 22, TypeScript strict
- **API:** Fastify v5, @fastify/static, @fastify/rate-limit, @fastify/cors
- **MCP:** @modelcontextprotocol/sdk (stdio transport)
- **DB:** SQLite (better-sqlite3) — auto-seeds 10 GBA factories
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Payments:** Stripe escrow (manual capture)
- **Notifications:** WeChat Work webhook + SendGrid email
- **Schemas:** Zod v4

## License

MIT
