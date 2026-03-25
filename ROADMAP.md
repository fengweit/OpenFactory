# OpenFactory — Implementation Roadmap
*Updated: March 24, 2026*

## Strategic Context

**The agentic procurement stack is forming now:**
- Lio ($30M a16z, Mar 2026) + Didero ($30M M12, Feb 2026) = $60M raised to automate buyer-side procurement
- Both companies' agents still send emails/WeChat to factories and wait 2–3 days
- OpenFactory is the missing factory-side API layer

**Our position:** Not competing with Lio/Didero — we're the infrastructure they need.
**Primary GTM:** API integration partner to Lio, Didero, and future agentic procurement platforms.

---

## Phase 0 — POC ✅ Complete (March 2026)

### Infrastructure
- [x] Fastify REST API + SQLite (better-sqlite3)
- [x] JWT auth (buyer + factory accounts)
- [x] Rate limiting (100 req/min per IP)
- [x] CORS headers
- [x] LaunchAgent (auto-restart on crash)
- [x] GitHub Actions CI (tsc + health checks)

### Factory Data
- [x] 20 GBA factories across 8 cities (Shenzhen, GZ, Dongguan, Foshan, Huizhou, Zhongshan, Jiangmen, Zhuhai)
- [x] 16/20 verified
- [x] `pricing_rules` table — tiered pricing per factory/category
- [x] `capacity_units_per_month` + `capacity_available` per factory

### API (v0.3)
- [x] `GET /factories` — search with filters
- [x] `POST /quotes` — async RFQ (fires WeChat notification)
- [x] `POST /orders` — escrow-protected order
- [x] `GET /orders/:id` — track with event history
- [x] `PATCH /orders/:id/status` — production milestone updates
- [x] `GET /analytics` — rich metrics (response rate, cities, GMV)
- [x] `GET /capacity` — **live capacity query** (10ms)
- [x] `GET /factories/:id/instant-quote` — **sub-second binding quote** (36ms)
- [x] `POST /quotes/:id/respond` — factory responds to quote
- [x] `GET /factory/quick-reply` — magic link for WeChat notifications
- [x] `POST /orders/:id/release-escrow` — buyer confirms receipt
- [x] `POST /webhooks/stripe` — Stripe event handler
- [x] `POST /auth/register` + `POST /auth/login`
- [x] `POST /onboard` + `GET /admin/applications`

### MCP Server (v0.3 — 8 tools)
- [x] `search_factories`
- [x] `get_quote` (async RFQ)
- [x] `get_instant_quote` ⚡ NEW — sub-second binding quote
- [x] `query_live_capacity` ⚡ NEW — real-time GBA capacity
- [x] `place_order`
- [x] `track_order`
- [x] `update_order_status`
- [x] `get_analytics`
- [x] `openfactory-mcp` npm package (npx installable)

### Services
- [x] Stripe escrow (stub — prod-ready with STRIPE_SECRET_KEY)
- [x] Email notifications — order confirm + shipping (stub — prod-ready with SENDGRID_API_KEY)
- [x] WeChat Work webhook — bilingual notifications (stub — prod-ready with WECHAT_WEBHOOK_URL)

### UI (9 pages)
- [x] `/` — landing page with live stats + search widget
- [x] `/buyer.html` — full sourcing flow (search → RFQ → compare → order → track → escrow release)
- [x] `/portal.html` — factory portal (JWT auth, real quotes/orders from API)
- [x] `/factory-mobile.html` — mobile-first Mandarin factory portal, magic link support
- [x] `/factory-guide.html` — bilingual printable onboarding guide
- [x] `/factories.html` — public GBA factory directory (city filter, category chips)
- [x] `/agent.html` — live capacity demo + MCP tool showcase
- [x] `/admin.html` — analytics dashboard + factory applications
- [x] `/onboard.html` — factory onboarding form

### Strategy Docs
- [x] `QIANHAI_PITCH.md` — updated with Lio/Didero framing
- [x] `OUTREACH.md` — cold email drafts (Lio, Didero, Xometry)
- [x] `OUTREACH_PLAN.md` — week-by-week send schedule

---

## Phase 1 — First Real Transaction (April–May 2026)
*Goal: 1 real factory, 1 real order, $1 real GMV*

### Factory Side
- [ ] **1 real factory onboarded** — get a Shenzhen factory owner to log in, set pricing rules, respond to a quote via magic link
- [ ] **Per-factory WeChat webhook** — each factory gets their own webhook URL (currently one global)
- [ ] **Phone number login** — factory owners log in with phone/WeChat ID, not factory slug
- [ ] **Factory verification workflow** — admin can approve/reject applications with notes
- [ ] **Pricing rule UI in factory-mobile.html** — factory sets their own price tiers and available capacity

### Buyer/API Side
- [ ] **Real Stripe keys** — actual escrow holding real USD
- [ ] **Real SendGrid keys** — actual email delivery
- [ ] **API key auth for partners** — Lio/Didero get API keys, rate limits per key
- [ ] **Webhook API** — push notifications to buyers when quote/order status changes
- [ ] **`POST /auth/register` hardened** — no auto-register fallback in production
- [ ] **`requireAuth` on `POST /orders`** — currently unauthenticated

### Integration (Lio/Didero)
- [ ] **Outreach sent** (see OUTREACH_PLAN.md)
- [ ] **Integration docs** — how to configure Claude Desktop / Lio / Didero with OpenFactory MCP
- [ ] **Sandbox environment** — isolated test factory data for API partners
- [ ] **OpenAPI spec** (`/openapi.json`) — machine-readable API spec for integration

### Metrics Targets (Phase 1 exit)
- 5 real factories with pricing rules set
- 1 real order with real escrow
- 1 API partner (Lio or Didero) in integration talks
- 50 `openfactory-mcp` npm installs

---

## Phase 2 — Scale (Q3 2026)
*Goal: 100 factories, $1M real GMV, 3 enterprise API clients*

- [ ] **100 verified factories** — expand beyond Shenzhen core to full GBA
- [ ] **WeChat Mini Program** — factory portal as native WeChat app (biggest adoption unlock)
- [ ] **Capacity calendar** — factories declare availability week-by-week (unlock true spot manufacturing)
- [ ] **Dispute resolution** — claim → evidence → decision → escrow release/refund
- [ ] **Factory rating system** — buyer reviews post-delivery, weighted by order size
- [ ] **Multi-currency** — USD / CNY / HKD with live FX
- [ ] **Sample order flow** — sub-MOQ samples before full production commitment
- [ ] **Qianhai OPC office** — physical presence for factory verification operations
- [ ] **API v2** — pagination, webhooks, versioning, per-partner rate limits

### Metrics Targets (Phase 2 exit)
- 100 factories, 80 verified
- $1M real GMV
- 3 enterprise API clients (Lio, Didero + 1 more)
- Qianhai office operational

---

## Phase 3 — Platform (2027)
*Goal: 1,000 factories, $10M GMV, Series A*

- [ ] **1,000 verified factories** — full GBA coverage + Vietnam/Indonesia expansion
- [ ] **Factory capacity futures** — book production capacity in advance (AWS Reserved model)
- [ ] **Spot manufacturing** — idle capacity sold at dynamic prices (AWS Spot model)
- [ ] **Marketplace mode** — factory-initiated listings, not just buyer RFQs
- [ ] **B2B financing** — factory payment terms (net-60) funded by OpenFactory
- [ ] **Physical verification team** — 5-person team doing factory audits in Qianhai
- [ ] **Series A** — $10M target, led by GBA-focused VC

### Metrics Targets (Phase 3 exit)
- 1,000+ factories
- $10M annualized GMV
- Series A closed

---

## Security / Tech Debt (do before any public launch)

- [ ] Rotate `JWT_SECRET` from default value
- [ ] Add `requireAuth` to `POST /orders`
- [ ] Add per-route rate limits on auth endpoints (stricter than 100/min)
- [ ] Add input validation (Zod) to all mutation endpoints
- [ ] Add test suite (currently 0 tests)
- [ ] Add structured logging (pino or equivalent)
- [ ] Add error monitoring (Sentry)
- [ ] Store `payment_intent_id` in orders table (currently stateless)

---

## Key Env Vars (for production)

| Var | Purpose | Status |
|-----|---------|--------|
| `STRIPE_SECRET_KEY` | Real escrow | ❌ Not set |
| `SENDGRID_API_KEY` | Real email | ❌ Not set |
| `WECHAT_WEBHOOK_URL` | Real WeChat push | ❌ Not set |
| `JWT_SECRET` | Auth security | ❌ Using default |
| `PUBLIC_URL` | Factory magic links | ❌ Using localhost |
| `PORT` | Server port | ✅ Default 3000 |
