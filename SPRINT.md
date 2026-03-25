# OpenFactory — Autonomous Sprint Queue

This file is the build loop's task queue.
The build agent reads the next PENDING task, executes it, marks it DONE.
**Do not reorder tasks** — they are sequenced by dependency.

---

## Active Sprint (Week 1 — Factory Supply Side)

### Format
`- [ ] TASK_ID | PRIORITY | description`
`- [x] TASK_ID | done | description` ← completed

---

- [x] T01 | done | Add PATCH /factories/:id/capacity endpoint — accepts { available_units, available_from, price_override_usd } — updates pricing_rules table; also add GET /factories/:id/capacity to read current declared capacity
- [ ] T02 | HIGH | Add capacity update UI to factory-mobile.html — new "产能" tab (4th tab) with: current capacity display, a form to update available_units + price_override + available_from date, submits to PATCH /factories/:id/capacity; mobile-first, dark theme, Mandarin labels
- [ ] T03 | HIGH | Fix portal.html renderOrderList — remove the orphaned old mock `orders.map(...)` block (~line 588); add advanceOrder(orderId, status) function that calls PATCH /orders/:id/status; add a working orders list that renders from real API data
- [ ] T04 | MED | Wire requireAuth preHandler to POST /orders route in server.ts — currently unprotected; add a test request to verify 401 without token
- [ ] T05 | MED | Update README.md — add "Lio-Ready Integration" section at top with: 3-line code sample (query_live_capacity → get_instant_quote → place_order), link to /lio-ready.html, npm install badge (npx openfactory-mcp), response time benchmarks (36ms quote, 10ms capacity)
- [ ] T06 | MED | Add /factories/:id/pricing-rules GET+PATCH API endpoints — GET returns current tiered pricing rules for a factory; PATCH allows factory owner to update their own pricing (auth: factory_id match); update factory-mobile.html pricing tab to show and edit rules
- [ ] T07 | LOW | Add factory self-registration flow to onboard.html — after form submit, auto-create a pricing_rules row with default values based on category selected; show factory owner their factory_id + magic link URL on success page
- [ ] T08 | LOW | Add webhook test endpoint POST /test/notify — sends a sample WeChat notification to WECHAT_WEBHOOK_URL with a mock quote; useful for verifying webhook config; returns {sent: true, payload: {...}} or {sent: false, error: ...}
- [ ] T09 | LOW | Create docs/API.md — auto-generated API reference with all endpoints, request/response schemas, example curl commands for each; link from README

---

## Backlog (next sprint)

- [ ] B01 | Per-factory WeChat webhook URL — add wechat_webhook_url column to factories table; use factory-specific URL if set, fall back to global WECHAT_WEBHOOK_URL
- [ ] B02 | Phone/WeChat ID login for factories — replace internal slug auth (sz-001) with phone number or WeChat ID
- [ ] B03 | Real factory data import — script to bulk-import real factory pricing curves from CSV
- [ ] B04 | 90-second demo video script — storyboard for screen recording: agent calls API, gets instant quote, places order

---

## Completed

(tasks move here when done)
