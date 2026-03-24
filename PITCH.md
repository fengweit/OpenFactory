# OpenFactory — Pitch for Coding Agent

> Read this before writing a single line of code.
> This is the why, the what, and the constraints. The how is in DEVELOPMENT.md.

---

## What We Are Building

**OpenFactory** is an MCP server that exposes verified Shenzhen factories as callable tools for AI agents.

Today, AI agents can call APIs, query databases, send emails, manage cloud infrastructure, and execute financial transactions. The one thing they cannot do is touch physical manufacturing. There is no API for a factory. There is no structured way for code to say "make me 500 of these."

We are building that API.

The core primitive is simple: a factory is just a service that accepts a spec and returns a product. Wrap it in MCP, and it becomes a tool call. That is OpenFactory.

---

## The Core Insight

Factories are MCP servers that haven't been wired up yet.

A factory has:
- **Capabilities** — what it can make, at what volume, with what certifications
- **Inputs** — product specs, quantity, deadline, budget
- **Outputs** — quoted price, lead time, manufactured goods, tracking

That is exactly the shape of an MCP tool. OpenFactory is the adapter layer that makes the connection.

---

## What the Agent Can Do

Once OpenFactory MCP server is running, an AI agent can:

```
"We need 800 custom-branded phone cases by May 15, budget $3/unit"
```

And autonomously:

1. Call `search_factories()` — get matched, verified factories by category, MOQ, price tier
2. Call `get_quote()` — get price, lead time, and MOQ from multiple factories in parallel
3. Compare and select the best match
4. Call `place_order()` — lock specs, hold payment in escrow, notify factory
5. Call `track_order()` — receive production milestones and shipping status

Zero humans on the buyer side. Zero procurement managers. Zero Alibaba browsing.

---

## The Four Tools (This Is The Entire API)

### `search_factories`
```typescript
Input:
  category?:      "electronics_accessories" | "pcb_assembly" | "plastic_injection"
                  | "metal_enclosure" | "cable_assembly"
  max_moq?:       number   // max minimum order quantity
  price_tier?:    "budget" | "mid" | "premium"
  min_rating?:    number   // 0–5
  verified_only?: boolean

Output:
  factories: Factory[]     // ranked list of matching factories
  count:     number
```

### `get_quote`
```typescript
Input:
  factory_id:          string   // from search_factories
  product_description: string   // plain language
  quantity:            number
  target_price_usd?:   number
  deadline_days?:      number

Output:
  quote_id:       string
  unit_price_usd: number
  total_price_usd: number
  lead_time_days: number
  moq:            number
  valid_until:    string   // ISO date, 7 days
```

### `place_order`
```typescript
Input:
  quote_id:  string   // from get_quote
  buyer_id:  string

Output:
  order_id:             string
  status:               "pending"
  escrow_held:          true
  estimated_ship_date:  string
```

### `track_order`
```typescript
Input:
  order_id: string

Output:
  status:   "pending" | "confirmed" | "in_production" | "qc" | "shipped" | "delivered"
  tracking: string?
```

---

## The Factory Data Model

This schema is the most important design decision in the codebase. Everything else is plumbing.

```typescript
type Factory = {
  id:       string
  name:     string
  name_zh:  string           // Mandarin name
  location: {
    city:     string         // "Shenzhen"
    district: string         // "Longhua", "Bao'an", "Qianhai", etc.
  }
  categories:               FactoryCategory[]
  moq:                      number
  lead_time_days: {
    sample:     number
    production: number
  }
  certifications:           string[]  // ["ISO9001", "CE", "RoHS"]
  price_tier:               "budget" | "mid" | "premium"
  capacity_units_per_month: number
  accepts_foreign_buyers:   boolean
  verified:                 boolean   // physically visited by OpenFactory team
  rating?:                  number    // 0–5, from completed orders
}
```

---

## The Trust Model (Critical Context)

The API is easy. Trust is the actual product.

A buyer sending real product specs and real money to an unknown Shenzhen factory via an API needs:

- **Factory verification** — OpenFactory physically visits every factory before listing. `verified: true` means a human walked in the door.
- **Escrow** — `place_order` never sends money to the factory directly. Payment is held until the buyer confirms receipt. `escrow_held: true` in every order.
- **NDA** — every factory signs an NDA covering buyer IP before onboarding. The `place_order` call is backed by a signed legal agreement.
- **Locked specs** — specs are immutable once an order is placed. The order record is the dispute resolution paper trail.

For the POC, escrow is a flag (`escrow_held: true`). In production, it's a real payment hold via Airwallex or similar. Build the flag now, wire the real payment later.

---

## What To Build (Priority Order)

### Phase 0 — Today (POC)
Get a working MCP server with mock data that a coding agent can actually call.

- [ ] MCP server running locally via stdio transport
- [ ] All four tools wired and returning structured JSON
- [ ] Mock factory database (5 factories, electronics vertical only)
- [ ] Mock pricing logic (formula-based, not real RFQ)
- [ ] REST API exposing same tools over HTTP
- [ ] End-to-end test: search → quote → order → track via curl

This is a demo. It proves the shape of the product.

### Phase 1 — First Real Factory
Replace one mock factory with a real onboarded factory.

- [ ] Factory onboarding form (captures real capability data into the schema)
- [ ] Async quote flow: `get_quote` notifies factory, factory responds, buyer polls
- [ ] Factory portal (simple web page, Mandarin, mobile-first)
- [ ] WeChat bot that pings factory on new quote request
- [ ] Real escrow integration (Airwallex or PingPong)

### Phase 2 — First Real Order
Complete one real transaction end-to-end.

- [ ] Spec attachment: buyer uploads PDF/image with order
- [ ] QC trigger: `track_order` status "qc" initiates QIMA inspection API call
- [ ] Escrow release: buyer confirms, payment released
- [ ] Order history and rating: buyer rates factory after completion
- [ ] Dispute flow: documented process when order arrives wrong

---

## Architecture Decisions (Don't Change These)

**TypeScript** — schema types are the product. Use Zod for runtime validation everywhere. The factory schema, quote schema, and order schema are contracts, not suggestions.

**MCP-first, REST second** — the MCP server is the primary interface. The REST API wraps the same logic for non-MCP integrations. Never duplicate business logic between them.

**No database for POC** — in-memory Maps for quotes and orders. JSON file for factories. Add a real DB (Postgres) when you have real factories.

**Stdio transport for MCP** — for local Claude Desktop integration. SSE transport for remote/production deployment.

**Async quotes by design** — even in the POC, the `get_quote` response shape should look like it could be async. Include a `valid_until` field and a `quote_id`. When real factories are onboarded, quotes will take hours, not milliseconds. The schema should not have to change.

---

## What This Is Not

Do not build:
- A marketplace UI — there is no browsing, no search bar, no product listings page
- A chat interface — the agent is the interface
- A supplier directory — this is not a Yellow Pages with contact forms
- A scraper of Alibaba — the value is verified, structured, API-native factories, not scraped noise

---

## The Pitch in One Paragraph

Every AI procurement agent built in the next 3 years will need to touch physical manufacturing. Today there is no API for that. Alibaba has no MCP server. Made-in-China.com has no structured data layer. Xometry covers US factories only. OpenFactory is the MCP adapter for Shenzhen — the world's densest manufacturing ecosystem. We verify the factories, hold the escrow, sign the NDAs, and expose the whole thing as four clean tool calls. The agent does the rest.

---

## Files In This Project

```
CORE.md          — full product spec, mental models, revenue model, open questions
DEVELOPMENT.md   — complete setup guide, all code, step-by-step instructions
PITCH.md         — this file, context for the coding agent
```

Start with `DEVELOPMENT.md` for the code.
Come back here when you need to make a decision about what to build.
