# OpenFactory Roadmap

## Phase 0 — POC ✅ Complete (March 2026)
- [x] MCP server with 4 tools (`search_factories`, `get_quote`, `place_order`, `track_order`)
- [x] REST API (Fastify) — GET /factories, POST /quotes, POST /orders, GET /orders/:id
- [x] 4-page UI — Landing, Buyer (multi-factory RFQ + quote compare), Factory Portal (dark, dashboard), AI Agent demo
- [x] Mock factory data — 5 verified Shenzhen factories (sz-001–sz-005)
- [x] gstack skills integrated (28 skills: /review, /qa, /cso, /plan-ceo-review, etc.)
- [x] GitHub Actions CI
- [x] Automated health check (every 30 min)

## Phase 1 — Real Data (April 2026)
- [ ] **SQLite persistence** — orders/quotes survive restarts; migrate from in-memory Maps
- [ ] **JWT auth** — buyer accounts + factory logins with real sessions
- [ ] **Factory onboarding form** — `/onboard.html` + admin verification workflow
- [ ] **WeChat webhook** — real push notifications to factories on new quote requests
- [ ] **Stripe escrow** — real payment holding; release on buyer delivery confirmation
- [ ] **5 real Shenzhen factories onboarded** — Qianhai district priority (OPC Mavericks)
- [ ] **Rate limiting + API keys** — basic abuse protection
- [ ] **Email notifications** — buyer order confirmations

## Phase 2 — Traction (May–June 2026)
- [ ] **Public factory directory** — `/factories` browse page, SEO-optimized
- [ ] **Quote analytics dashboard** — response rates, win rates, avg pricing by category
- [ ] **Factory rating system** — buyer reviews post-delivery, weighted score
- [ ] **`openfactory-mcp` npm package** — any dev can `npm install openfactory-mcp`
- [ ] **3 paying buyers** — real sourcing transactions with escrow
- [ ] **Dispute resolution workflow** — claim → evidence → decision → escrow release/refund
- [ ] **Multi-language** — ZH/EN already partial; complete translation pass
- [ ] **Webhook API** — buyers get push notifications on quote/order status changes

## Phase 3 — Platform (Q3 2026)
- [ ] **50 verified factories** — expand beyond electronics into garments, furniture, tooling
- [ ] **Multi-currency** — USD / CNY / HKD with live FX
- [ ] **Factory capacity calendar** — real availability, not just MOQ
- [ ] **Sample order flow** — sub-MOQ samples before full production commitment
- [ ] **Qianhai OPC office** — physical presence → factory visit pipeline for verification
- [ ] **API v2** — pagination, filtering, webhooks, rate limiting, versioned endpoints
- [ ] **B2B marketplace mode** — factory-initiated listings, not just buyer-initiated RFQs

## Metrics targets
| Metric | Target |
|--------|--------|
| Factory quote response rate | >90% within 4 hours |
| Order escrow release | <24h after delivery confirmation |
| API uptime | 99.9% |
| Verified factories | 5 (Phase 1) → 50 (Phase 3) |
| LLM cost | <$9/month |
| Time to first quote | <2 minutes from search |

## How to contribute
See [DEVELOPMENT.md](./DEVELOPMENT.md) for full build guide.

Quick start:
```bash
npm install
npm run api      # REST API on :3000
npm run mcp      # MCP server (stdio)
```

Run gstack skills from Claude Code:
- `/review` — code quality audit
- `/cso` — OWASP + STRIDE security audit  
- `/qa http://localhost:3000` — browser QA all 4 pages
- `/plan-ceo-review` — product scope challenge
