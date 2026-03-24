# OpenFactory — Development Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Agents (Claude, GPT, etc.)           │
│                  ┌──────────────────────────────┐               │
│                  │       MCP Server (stdio)      │               │
│                  │   search · quote · order · track              │
│                  └──────────────┬───────────────┘               │
└─────────────────────────────────│───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                     REST API (Fastify :3000)                     │
│   /factories  /quotes  /orders  /analytics  /onboard  /auth     │
│           Rate limit: 100 req/min per IP                         │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
         ┌─────────▼──────────┐  ┌────────▼────────────┐
         │  SQLite (better-   │  │  WeChat Work webhook │
         │  sqlite3) WAL mode │  │  (notify factories)  │
         │  data/openfactory  │  └──────────────────────┘
         │       .db          │
         └────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Static Pages      │
         │  public/*.html     │
         │  (Fastify static)  │
         └────────────────────┘
```

## Directory Structure

```
OpenFactory/
├── src/
│   ├── api/server.ts        # Fastify REST API — all routes
│   ├── mcp/server.ts        # MCP server (stdio) — 6 tools
│   ├── db/
│   │   ├── db.ts            # SQLite connection, schema, seed
│   │   └── factories.ts     # All DB operations
│   ├── auth/jwt.ts          # JWT auth (register, login, preHandler)
│   ├── schemas/quote.ts     # Zod schemas (shared API + MCP)
│   └── services/wechat.ts   # WeChat Work notification service
├── public/                  # Static HTML (served at /)
│   ├── index.html           # Landing page
│   ├── buyer.html           # Full buyer flow (5 steps)
│   ├── portal.html          # Factory portal (dark, sidebar nav)
│   ├── agent.html           # AI agent MCP demo (live tool calls)
│   ├── admin.html           # Admin dashboard (analytics, applications)
│   └── onboard.html         # Factory onboarding (4-step form → POST /onboard)
├── data/
│   ├── factories.json       # Seed data — 10 GBA factories
│   └── openfactory.db       # SQLite (auto-created, gitignored)
├── scripts/
│   └── health_check.sh      # Cron health check — Slack alert on failure
├── .github/workflows/ci.yml # GitHub Actions — tsc + 4 health checks
├── .env.example             # Environment template
├── ROADMAP.md               # Phase 0–3 plan
└── DEVELOPMENT.md           # This file
```

## Key Design Decisions

### ESM + CJS Interop
TypeScript strict ESM (`"module": "Node16", "type": "module"`).
CJS packages (`better-sqlite3`, `bcryptjs`, `jsonwebtoken`) loaded via:
```ts
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
```

### SQLite Schema
Tables: `factories`, `quotes`, `orders`, `order_events`, `users`, `factory_applications`
- `getDb()` returns a singleton with WAL mode + foreign keys enabled
- DB auto-created and seeded from `data/factories.json` on first run
- Binary `.db` files are gitignored — never commit DB files

### MCP Transport
Stdio transport (not HTTP) — Claude Desktop spawns the process and communicates via stdin/stdout. Each tool call is synchronous DB access (no async needed with better-sqlite3).

### Auth Flow
```
POST /auth/register → hash password (bcryptjs) → store user → return JWT
POST /auth/login    → verify password → return JWT
Protected routes    → requireAuth preHandler → verify JWT → attach req.user
```
JWT secret via `JWT_SECRET` env var. Default dev secret **must** be overridden in production.

### WeChat Notifications
Two events trigger notifications:
1. `POST /quotes` → `notifyNewQuoteRequest()` (factory notified of new RFQ)
2. `POST /orders` → `notifyOrderConfirmed()` (factory notified of confirmed order)

Both are **non-blocking** (`.catch(() => {})`) — API response never waits on webhook.
In dev mode (no `WECHAT_WEBHOOK_URL`): logs bilingual message to console.

## Running Locally

```bash
npm install
npm run api     # REST API + static pages at http://localhost:3000
npm run mcp     # MCP server (stdio) — for Claude Desktop

# Reset DB (re-seeds on next start):
rm data/openfactory.db*
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | API listen port |
| `DB_PATH` | No | `data/openfactory.db` | SQLite file path |
| `JWT_SECRET` | **Yes (prod)** | dev-secret | JWT signing key — change in production |
| `WECHAT_WEBHOOK_URL` | No | — | WeChat Work webhook for factory notifications |
| `SLACK_BOT_TOKEN` | No | — | Slack bot token for health check alerts |
| `SLACK_CHANNEL` | No | — | Slack channel ID for alerts |

## API Quick Reference

```bash
# Search factories
curl 'http://localhost:3000/factories?category=pcb_assembly&verified_only=true'

# Get quote
curl -X POST http://localhost:3000/quotes \
  -H 'Content-Type: application/json' \
  -d '{"factory_id":"sz-001","product_description":"USB-C cables","quantity":1000}'

# Place order
curl -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -d '{"quote_id":"q-xxxxx","buyer_id":"buyer-001"}'

# Track order
curl http://localhost:3000/orders/ord-xxxxx

# Update status (factory-side)
curl -X PATCH http://localhost:3000/orders/ord-xxxxx/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"shipped","note":"FedEx 123456789"}'

# Analytics
curl http://localhost:3000/analytics

# Submit factory application
curl -X POST http://localhost:3000/onboard \
  -H 'Content-Type: application/json' \
  -d '{"name_en":"My Factory","wechat_id":"my_wechat","city":"Shenzhen","categories":["pcb_assembly"],"moq":200,"contact_name":"John","price_tier":"mid"}'

# Auth
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"pass123"}'
```

## Factory IDs

| ID | Name | City | Rating | Verified |
|----|------|------|--------|----------|
| sz-001 | Longhua Electronics | Shenzhen | 4.3★ | ✅ |
| sz-002 | Bao'an Precision Plastics | Shenzhen | 4.1★ | ✅ |
| sz-003 | GBA Metal Works | Shenzhen | 4.7★ | ✅ |
| sz-004 | Futian PCB Assembly | Shenzhen | 3.9★ | ❌ |
| sz-005 | Qianhai Global Accessories | Shenzhen/Qianhai | 4.5★ | ✅ |
| gz-001 | Tianhe Smart Wearables | Guangzhou | 4.6★ | ✅ |
| dg-001 | Dongguan Rapid Tooling | Dongguan | 4.4★ | ✅ |
| sz-006 | Nanshan IoT Solutions | Shenzhen | 4.8★ | ✅ |
| sz-007 | Shajing Budget Cables | Shenzhen | 4.0★ | ✅ |
| fs-001 | Foshan Furniture Plus | Foshan | 4.2★ | ❌ |

## GitHub Actions CI

On every push/PR:
1. `npx tsc --noEmit` — TypeScript check
2. Starts server, runs 4 health checks: `/health`, `/factories`, `/quotes`, `/analytics`
3. Fails PR if any check fails

## Deployment

Phase 0: local demo (Mac mini)
Phase 1: VPS (DigitalOcean/Alibaba Cloud HK) — `npm run api` behind nginx + PM2
Phase 2: Containerize — `Dockerfile` + `docker-compose.yml` + managed DB

See [ROADMAP.md](./ROADMAP.md) for full plan.
