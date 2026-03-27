# OpenFactory — Project Memory
_All context an agent needs to work on this project_
_Last updated: 2026-03-24_

---

## ⚠️ STRATEGIC DIRECTION — LOCKED IN (2026-03-26)

**CEO decision: Intelligence Layer Only. This is V1. Do not deviate.**

OpenFactory V1 is a **Manufacturing Intelligence API** — read-only, no transactions.

- `search_factories()` — factory discovery
- `get_instant_quote()` — indicative price signals (not binding)
- `query_live_capacity()` — live availability (green/yellow/red)
- `place_order()` — exists in code, NOT the V1 pitch

**Revenue:** API subscriptions ($199/$999/$2K–$10K/month). No GMV. No transactions.

**Why:** Trust, cross-border payment, and shipping logistics are each independently unsolvable at solo-founder stage. Intelligence layer sidesteps all three. Full analysis in `PRODUCT_DIRECTION_V2.md`.

**The expansion path exists** (V2: RFQ routing → V3: facilitated intro → V4: managed transactions) but is NOT the current focus. Don't get pulled into transaction infrastructure.

---

## What It Is

OpenFactory turns verified Shenzhen factories into callable tools for AI agents.

**V1 mental model:** Bloomberg Terminal for manufacturing. Gives procurement agents the intelligence to make sourcing decisions in milliseconds — not the execution of the trade.

Any AI agent on Claude, GPT-4, or any MCP-compatible runtime can call:
- `search_factories()` — find verified GBA factories by category, MOQ, certifications
- `get_instant_quote()` — instant price signal from factory's pre-declared pricing rules
- `query_live_capacity()` — real-time availability across all factories

The technology is easy. The real work is: physical factory visits to get real pricing data, and a simple capacity update mechanism (mobile form via WeChat link) to keep data fresh.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `CORE.md` | Full product spec — mental models, trust architecture, revenue model, open questions |
| `DEVELOPMENT.md` | Complete POC build guide — TypeScript, MCP SDK, Fastify, schemas, mock data, Claude Desktop config |
| `PITCH.md` | Context for coding agents — what to build and why, before writing a line of code |
| `PLAN.md` | 3-phase roadmap: POC → async + real factories → first real order |
| `MEMORY.md` | This file — project context for AI agents |

**GitHub:** https://github.com/fengweit/OpenFactory
**Local:** `~/Desktop/OpenFactory/` — single source of truth

---

## The Four Tools (Full Spec)

```typescript
search_factories(
  category?:      "electronics_accessories" | "pcb_assembly" | "plastic_injection"
                  | "metal_enclosure" | "cable_assembly"
  max_moq?:       number
  price_tier?:    "budget" | "mid" | "premium"
  min_rating?:    number   // 0–5
  verified_only?: boolean
) → Factory[]

get_quote(
  factory_id:          string   // from search_factories
  product_description: string   // plain language
  quantity:            number
  target_price_usd?:   number
  deadline_days?:      number
) → QuoteResponse

place_order(
  quote_id:  string
  buyer_id:  string
) → Order  // escrow_held: true always

track_order(
  order_id: string
) → Order  // status: pending → confirmed → in_production → qc → shipped → delivered
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript (strict) |
| MCP server | `@modelcontextprotocol/sdk` — stdio transport for local, SSE for production |
| REST API | Fastify — same logic, HTTP interface |
| Schema validation | Zod everywhere |
| Mock DB | `data/factories.json` + in-memory Maps for quotes/orders |
| Real DB (Phase 1+) | PostgreSQL |
| Runtime | Node.js 20+ |

---

## Project Structure

```
openfactory/
├── src/
│   ├── mcp/
│   │   ├── server.ts           # MCP server entrypoint
│   │   └── tools/
│   │       ├── search.ts
│   │       ├── quote.ts
│   │       └── order.ts
│   ├── api/
│   │   └── server.ts           # Fastify REST API
│   ├── db/
│   │   └── factories.ts        # Query logic + in-memory store
│   └── schemas/
│       ├── factory.ts
│       ├── quote.ts
│       └── order.ts
├── data/
│   └── factories.json          # 5 mock Shenzhen factories
├── claude_desktop_config.json
├── package.json
└── tsconfig.json
```

---

## Mock Factory Data (5 factories in data/factories.json)

| ID | Name | District | Category | MOQ | Tier | Verified | Rating |
|----|------|----------|----------|-----|------|----------|--------|
| sz-001 | Longhua Electronics Co. | Longhua | electronics_accessories, cable_assembly | 500 | mid | ✅ | 4.3 |
| sz-002 | Bao'an Precision Plastics | Bao'an | plastic_injection, electronics_accessories | 1000 | budget | ✅ | 4.0 |
| sz-003 | GBA Metal Works | Nanshan | metal_enclosure, electronics_accessories | 200 | premium | ✅ | 4.7 |
| sz-004 | Futian PCB Assembly | Futian | pcb_assembly, electronics_accessories | 100 | mid | ❌ | 3.9 |
| sz-005 | Qianhai Global Accessories | Qianhai | electronics_accessories, cable_assembly, plastic_injection | 300 | mid | ✅ | 4.5 |

---

## Build Phases

### Phase 0 — POC (now)
- MCP server running locally via stdio
- All 4 tools wired, returning structured JSON
- Mock factory data only
- REST API alongside MCP server
- End-to-end test: search → quote → order → track via curl
- Wire into Claude Desktop

### Phase 1 — First Real Factory
- In-person factory visit in Shenzhen (target: Qianhai zone first)
- Sign NDA (CN + EN dual-language)
- Async quote flow: get_quote notifies factory → factory responds via portal
- Factory portal: simple Next.js, Mandarin, mobile-first
- WeChat bot notifies factory on new quote request
- Real escrow: Airwallex (preferred) or PingPong

### Phase 2 — First Real Order
- Spec attachment: buyer uploads PDF/image
- QC trigger: QIMA API integration
- Escrow release: buyer confirms → payment to factory
- Factory rating after completion
- Dispute flow documented and tested

---

## Key Open Decisions

| Decision | Options | Status |
|----------|---------|--------|
| Escrow partner | Airwallex vs Stripe+local vs PingPong | Open |
| Async quote SLA | 4h vs 8h vs 24h (target: 4h during CST hours) | Open |
| Min factory count before charging | 15 across 2–3 verticals | Open |
| Spec format for complex products | Plain language only vs structured fields | Open |
| Dispute resolution policy | Write before first real order | Open |
| Legal entity | HK Ltd vs Shenzhen WFOE vs Qianhai sole proprietor | Open |

---

## Revenue Model (V1 — Intelligence Layer)

| Tier | Who | Price |
|------|-----|-------|
| Starter | Indie devs, small teams | $199/month |
| Pro | Mid-sized platforms | $999/month |
| Enterprise | Lio, Didero, ERPs | $2,000–$10,000/month |
| Data License | Research/analysts | $15K–$50K/year |

**Factories list for free.** They get leads; OpenFactory gets supply. No factory pays anything.

**One Lio deal at $5K/month = $60K ARR. That's the target.**

---

⛔ OLD revenue model (GMV commission, escrow float) is NOT V1. Do not pitch it. Do not build for it.

---

## Qianhai OPC Connection

OpenFactory is the primary application for the Qianhai OPC Mavericks Program (launched Mar 18, 2026).
- Apply: inqianhai@qhidg.com (founder resume + pitch deck)
- Benefits: free 200㎡ office + 50㎡ housing + 50P compute + ¥600K/yr talent reward + seed + legal/visa
- The office in Qianhai zone = direct factory access. This is the biggest unlock.
- The program's cross-border mandate directly enables the escrow + NDA infrastructure.

---

## What NOT to Build (V1)

- ⛔ **No order placement infrastructure** — not the V1 pitch, don't build it out
- ⛔ **No escrow or payment rails** — cross-border B2B payments require licensing; not now
- ⛔ **No shipping coordination** — customs, freight, logistics = entire industry; not now
- ⛔ **No QC inspection integration** — Phase 3+ problem
- ⛔ **No dispute resolution system** — only needed when transactions exist
- ⛔ No marketplace UI — no browsing, no search bar, no product listings page
- ⛔ No chat interface — the agent is the interface
- ⛔ No Alibaba scraping — value is verified, structured, API-native
- ⛔ No CAD file quoting (that's Xometry, different category)
- ⛔ No US/EU factories (GBA only for now)
