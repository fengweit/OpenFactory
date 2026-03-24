# OpenFactory

> What Stripe did for payments, OpenFactory does for manufacturing.

Connect with **10 verified GBA factories** (Shenzhen · Guangzhou · Dongguan · Foshan). Get quotes in hours. Order with escrow protection. Every factory is callable as an MCP tool.

**[Buyer Portal](http://localhost:3000/buyer.html)** · **[Factory Portal](http://localhost:3000/portal.html)** · **[AI Agent Demo](http://localhost:3000/agent.html)** · **[Admin](http://localhost:3000/admin.html)** · **[List Your Factory](http://localhost:3000/onboard.html)**

---

## Quick start

```bash
npm install
npm run api      # REST API + 6 pages at http://localhost:3000
npm run mcp      # MCP server (stdio transport)
```

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page — value prop + entry points |
| `/buyer.html` | Buyer flow — Search → Multi-RFQ → Compare → Order → Track |
| `/portal.html` | Factory portal — Dashboard, Quotes, Orders, Profile |
| `/agent.html` | AI Agent demo — live MCP tool calls in browser |
| `/admin.html` | Admin dashboard — analytics, factory performance |
| `/onboard.html` | Factory onboarding — 4-step application form |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/factories` | Search factories (query: category, max_moq, price_tier, verified_only) |
| POST | `/quotes` | Request quote from a factory |
| POST | `/orders` | Place an escrow-protected order |
| GET | `/orders/:id` | Track order status + event history |
| PATCH | `/orders/:id/status` | Update production milestone (factory-side) |
| GET | `/analytics` | Platform analytics — GMV, quote volume, factory stats |
| POST | `/onboard` | Submit factory application |
| GET | `/admin/applications` | List factory applications (admin) |
| POST | `/auth/register` | Register buyer/factory account |
| POST | `/auth/login` | Login, get JWT |

Rate limit: 100 req/min per IP.

## MCP Tools (v0.2)

| Tool | Description |
|------|-------------|
| `search_factories` | Filter 10 GBA factories by category, MOQ, price tier, rating |
| `get_quote` | Request quote — returns unit price, total, lead time |
| `place_order` | Place escrow-protected order |
| `track_order` | Get production status + full event history |
| `update_order_status` | Update production milestone (confirmed/in_production/qc/shipped/delivered) |
| `get_analytics` | Platform analytics snapshot |

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

## Factories (10 verified GBA locations)

| ID | Name | City | Categories | Tier | Rating |
|----|------|------|------------|------|--------|
| sz-001 | Longhua Electronics | Shenzhen | Electronics, Cable | Mid | 4.3 ★ |
| sz-002 | Bao'an Precision Plastics | Shenzhen | Plastic injection | Budget | 4.1 ★ |
| sz-003 | GBA Metal Works | Shenzhen | Metal enclosure | Premium | 4.7 ★ |
| sz-004 | Futian PCB Assembly | Shenzhen | PCB | Mid | 3.9 ★ |
| sz-005 | Qianhai Global Accessories | Shenzhen/Qianhai | Electronics, Cable, Plastic | Mid | 4.5 ★ |
| gz-001 | Tianhe Smart Wearables | Guangzhou | Electronics, PCB | Premium | 4.6 ★ |
| dg-001 | Dongguan Rapid Tooling | Dongguan | Plastic, Metal | Mid | 4.4 ★ |
| sz-006 | Nanshan IoT Solutions | Shenzhen | PCB, Electronics | Premium | 4.8 ★ |
| sz-007 | Shajing Budget Cables | Shenzhen | Cable | Budget | 4.0 ★ |
| fs-001 | Foshan Furniture Plus | Foshan | Furniture | Mid | 4.2 ★ |

## Tech stack

- **Runtime:** Node.js 22, TypeScript (strict)
- **API:** Fastify v5 + @fastify/static + @fastify/rate-limit
- **MCP:** @modelcontextprotocol/sdk (stdio transport)
- **DB:** SQLite (better-sqlite3) — auto-seeds on first run
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Schemas:** Zod v4
- **Notifications:** WeChat Work webhook (configurable via WECHAT_WEBHOOK_URL)
- **Dev tools:** tsx, gstack (28 skills), GitHub Actions CI

## Environment

Copy `.env.example` to `.env`:

```bash
PORT=3000
DB_PATH=data/openfactory.db
JWT_SECRET=your-64-char-secret
WECHAT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture and full build guide.
See [ROADMAP.md](./ROADMAP.md) for Phase 0→3 plan.

## gstack skills (code quality)

```bash
# From Claude Code in this directory:
/review          # Staff engineer code review
/cso             # OWASP + STRIDE security audit
/qa http://localhost:3000    # Browser QA — all 6 pages
/plan-ceo-review # Product scope challenge
```

## License

MIT
