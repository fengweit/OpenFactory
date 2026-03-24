# OpenFactory — Build & Launch Plan
> Version 0.1 · March 2026 · Fengwei Tian

---

## What We're Building

An MCP server + REST API that turns verified Shenzhen factories into callable tools for AI agents. Any agent can call `search_factories`, `get_quote`, `place_order`, `track_order` the same way it calls a database or cloud function. Manufacturing becomes programmable.

**Mental model:** What Stripe did for payments, OpenFactory does for manufacturing.

---

## Phase 1 — POC (Weeks 1–2)
> Goal: working MCP server, 3 tools, mock data, demo-ready for Qianhai pitch

### Week 1: Core Build
- [ ] Init TypeScript project, install `@modelcontextprotocol/sdk`, `fastify`, `zod`
- [ ] Write factory capability schema (`src/schemas/factory.ts`)
- [ ] Write quote + order schemas (`src/schemas/quote.ts`, `order.ts`)
- [ ] Seed `data/factories.json` with 5 mock Shenzhen factories (done in DEVELOPMENT.md)
- [ ] Build DB query layer (`src/db/factories.ts`) — search + pricing logic + in-memory order store
- [ ] Build MCP server (`src/mcp/server.ts`) — `search_factories`, `get_quote`, `place_order`, `track_order`
- [ ] Build Fastify REST API (`src/api/server.ts`) — same 4 endpoints over HTTP
- [ ] Wire into Claude Desktop (`claude_desktop_config.json`)
- [ ] Run end-to-end POC test script (curl → search → quote → order → track)

### Week 2: Demo Polish
- [ ] Test full flow inside Claude Desktop: "I need 800 phone cases by May 15, budget $3/unit"
- [ ] Record a 3-minute demo video showing agent calling all 4 tools
- [ ] Write `DEMO.md` with the phone case scenario scripted step by step
- [ ] Fix any schema edge cases (quantity validation, MOQ checks, quote expiry)
- [ ] Push all code to `github.com/fengweit/OpenFactory`

**POC Definition of Done:**
An AI agent in Claude Desktop can take a natural language manufacturing request, search for matching factories, get multiple quotes in parallel, place an order, and receive an order ID — all without a human touching a keyboard after the initial request.

---

## Phase 2 — Async + Real Factories (Weeks 3–6)
> Goal: first 3 real factory relationships, real quote flow, factory portal stub

### Factory Onboarding (highest priority — this is the moat)
- [ ] Build factory onboarding form (basic: name, category, MOQ, certifications, WeChat ID)
- [ ] In-person visits: target 3 factories in Shenzhen electronics accessories vertical
  - Focus areas: Longhua, Bao'an, Qianhai zone
  - Bring NDA template (Chinese + English dual-language)
  - Photograph facility, production line, certifications
- [ ] Sign NDA with each factory covering buyer IP and product specifications
- [ ] Add real factories to database (replace mock data)

### Async Quote Flow
- [ ] Replace mock pricing formula with real async flow:
  1. `get_quote()` creates a pending quote record → notifies factory via WeChat bot or email
  2. Factory responds through simple web portal
  3. Buyer polls `GET /quotes/:id` or receives webhook when quote is ready
- [ ] Build minimal factory portal (Next.js): login → see pending quote requests → submit price + lead time
- [ ] Set quote response SLA: 4 hours during business hours (08:00–20:00 CST)
- [ ] Handle timeout: if no response in 4h, auto-mark as unavailable, suggest next factory

### Escrow Partner Decision
Choose one: Airwallex (best for cross-border B2B, USD in / RMB out), Stripe + local acquirer, or PingPong
- [ ] Research and decide by end of Week 3
- [ ] Integrate escrow hold on `place_order` — real money, not a flag

---

## Phase 3 — Launch (Weeks 7–12)
> Goal: first paying customer, 10 verified factories, $10K GMV

### Minimum Viable Factory Count: 15 across 2–3 verticals
Verticals for v1:
1. Electronics accessories (phone cases, enclosures, cables) — highest volume, lowest complexity
2. PCB assembly — higher value, more technical buyers
3. Plastic injection — broadens category coverage

### Go-To-Market: Where Day-One Customers Are
Target: solo hardware founders, small product teams, IoT startups

Channels (in priority order):
1. **Hacker News** — "Show HN: I built an MCP server for Shenzhen factories" — technical audience, exactly the buyer persona
2. **Product Hunt** — launch day, drive awareness
3. **Discord communities** — Hardware Weekend, Indie Hardware, MCP developer communities
4. **X/Twitter** — demo video of agent ordering phone cases end-to-end
5. **Direct outreach** — Kickstarter/Indiegogo campaigns that mention Shenzhen sourcing

Messaging: "Your AI agent can now order from Shenzhen factories. One tool call."

### Pricing at Launch
- Free tier: 3 quotes/month (demo + exploration)
- Starter: $49/month — 20 quotes, 5 orders, 1% escrow fee
- Professional: $299/month — unlimited quotes, 10 orders/month, 0.5% escrow fee
- Enterprise / API: Revenue share (5-8% of GMV) — for procurement agents placing large orders

### Factory Side
- Factory listing: free during beta
- Premium listing ($299/month): priority in search results, analytics dashboard
- Only charge factories after demonstrating real order flow

---

## Key Decisions to Resolve (Pre-Launch)

| Decision | Options | Deadline |
|---|---|---|
| Escrow partner | Airwallex vs Stripe+local vs PingPong | Week 3 |
| Async quote SLA | 4h vs 8h vs 24h | Week 3 |
| Minimum factory count to charge | 10 vs 15 vs 20 | Week 5 |
| Spec format for complex products | Plain language only vs structured fields vs CAD support | Week 4 |
| Dispute resolution policy | Write policy before first real order | Week 6 |
| Factory portal language | Mandarin-only vs bilingual | Week 4 |
| Legal entity | HK Ltd vs Shenzhen WFOE vs sole proprietor via Qianhai | Week 8 |

---

## Moat-Building Activities (Ongoing)

These are NOT engineering tasks. They are the product.

1. **Factory relationship depth** — every verified factory is a brick in the wall. A competitor with a better API but no factories has nothing.
2. **Trust infrastructure** — every NDA signed, every escrow transaction completed, every dispute resolved cleanly adds to the track record.
3. **Data flywheel** — every order teaches us real pricing, real lead times, real reliability. Mock pricing becomes real pricing. Quotes become more accurate.
4. **WeChat presence** — the factory-side relationship lives on WeChat. Building a WeChat bot and group presence with factory owners is a distribution channel no Western competitor can replicate easily.

---

## Qianhai Application Angle

OpenFactory is an ideal fit for the Qianhai OPC Mavericks Program because:
- Physical location in Qianhai = access to Qianhai zone factories first
- Cross-border infrastructure (escrow, IP, legal) is exactly what Qianhai provides
- One-person company building AI infrastructure for global commerce = the program's stated mission
- GBA manufacturing ecosystem = the product's entire supply side

**The ask from Qianhai:**
- Office in Qianhai zone → credibility with Qianhai-zone factories, physical presence for onboarding
- Legal + compliance support → NDA templates, escrow structuring, CSRC-adjacent questions
- Factory network introductions → the single biggest accelerator for Phase 2
- Compute for MCP server scaling → as order volume grows
- Seed funding intro → for hiring a Mandarin-native BD person to do factory onboarding at scale

---

## Success Metrics

| Milestone | Target | Timeline |
|---|---|---|
| POC demo working | All 4 tools callable in Claude Desktop | Week 2 |
| First real factory onboarded | 1 verified factory, real quote response | Week 5 |
| First real order | $0 GMV → first paid order placed | Week 8 |
| 10 verified factories live | 10 factories across 2+ verticals | Week 12 |
| First $10K GMV month | ~$600–800 revenue at 6–8% take | Month 4 |
| Qianhai application submitted | With demo video + POC link | Week 2 |

---

## What's Not In Scope (v1)

- CAD file quoting (Xometry territory)
- US/EU factories (GBA only for now)
- Freight forwarding / customs (third-party integration, v2)
- QC inspection (QIMA integration, v2)
- Mobile app (web portal only)
- Consumer-facing product (B2B only)

---

*Document lives at: ~/Desktop/OpenFactory/PLAN.md*
*GitHub: https://github.com/fengweit/OpenFactory*
