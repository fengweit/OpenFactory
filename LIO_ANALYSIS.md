# Lio (askLio) — Deep Competitive Analysis for CEO Review
_Prepared for /plan-ceo-review — March 24, 2026_

---

## TL;DR

Lio raised $33M total ($30M Series A from a16z, Mar 2026). They are building the "world's first AI procurement workforce" — AI agents that fully execute enterprise procurement end-to-end. They serve 100+ Fortune 500 clients and claim billions in managed spend. 

**Their critical gap:** Their agents still contact GBA factories the same way a human would — email, WeChat, phone. The factory side has no API. OpenFactory is that API.

---

## Company Profile

| Field | Detail |
|-------|--------|
| Company | Lio (formerly askLio) |
| CEO | Vladimir Keil |
| Co-founders | Lukas Heinzmann, Till Wagner |
| Founded | 2023 (YC Spring '23) |
| Total raised | $33M |
| Series A | $30M — a16z led; SV Angels, Harry Stebbings, YC participated |
| Announcement | March 5, 2026 (TechCrunch) |
| Headquarters | New York City Metro Area |
| Website | lio.ai (rebranded from asklio.ai) |

---

## Product — What Lio Actually Does

### Core Claim
"Instead of building software to help humans do procurement work faster, Lio deploys AI agents that execute the workflow themselves."

### What Their Agents Do
1. Read documents and POs from ERP systems
2. Evaluate suppliers from existing supplier databases
3. Negotiate terms (email/phone/WeChat with suppliers)
4. Complete transactions (PO generation, approval workflows)
5. Run compliance checks
6. Cross-reference budgets

### Integration Points
- Operates inside MS Teams / P2P systems (as a copilot layer)
- Reads from ERP: SAP, Oracle, etc.
- Reads from contract management systems
- Reads from supplier databases

### Traction
- 100+ Fortune 500 enterprise clients
- "Billions in managed spend"
- One client (global manufacturer): automated 75% of outsourced procurement operations within 6 months
- "Processes that once took weeks now completed in minutes"

### Business Model
Enterprise SaaS (presumably per-seat or % of spend managed)

---

## Market Position

### Why Lio Won the Buyer Side
1. **Timing**: Born in the era of agentic AI — not retrofitted
2. **Agentic-first architecture**: Agents do the work, not assist humans
3. **Existing systems integration**: Works inside SAP/Oracle/MS Teams — no migration required
4. **Enterprise trust**: YC + a16z pedigree unlocked Fortune 500 doors
5. **Proof of traction**: Real clients, real savings claims, measurable automation rates

### Their Go-To-Market
- Top-down enterprise sales (Fortune 500)
- Expansion capital: US geographic expansion + agent capability expansion
- No mention of SMB or marketplace models

---

## The Critical Gap — Where OpenFactory Lives

### Lio's Last-Mile Problem
Lio's agents can:
✅ Read an RFQ from internal systems
✅ Search a supplier database to find relevant factories
✅ Generate a quote request email

**But then they have to:**
❌ Send an email to a Shenzhen factory at 2am China time
❌ Wait 2-3 business days for a human at that factory to respond
❌ Receive an unstructured reply (no schema, no programmatic access)
❌ Parse the reply manually or via another LLM pass
❌ Follow up via WeChat because the factory stopped responding to email

**This is where Lio's automation breaks down.**

The last mile — GBA factory communication — is still email + WeChat + phone. It's human-speed, unstructured, and inherently async. Lio's agent is blocked waiting for a factory response.

### What OpenFactory Provides

```
Lio Agent                              GBA Factory
-----------                            -----------
"I need a quote for 5,000 PCBs"
    |
    ▼
[OLD WAY - still how Lio works today]
→ Sends email to factory
→ Waits 2-3 days
← Factory replies in Chinese, no schema
→ LLM parses email
→ Lio agent continues

[NEW WAY - OpenFactory]
→ Calls GET /factories/sz-006/instant-quote?category=pcb_assembly&qty=5000
← { unit_price: 4.20, lead_time_days: 21, total: 21000, confidence: 0.98 }
→ Lio agent continues IMMEDIATELY
```

**Speed delta: 3 days → 36 milliseconds**

---

## Competitive Moat Analysis

### Lio's Moats
1. **Brand/trust** with Fortune 500 — hard to displace
2. **ERP integrations** — deep technical moats (SAP/Oracle are complex)
3. **Existing supplier data** — network effects in their supplier database
4. **a16z backing** — signals credibility to enterprise buyers
5. **First mover** in agentic procurement

### Lio's Weaknesses (OpenFactory's Opportunities)
1. **No GBA supply-side infrastructure** — factories are still email/WeChat
2. **Geographic blind spot** — HQ in NYC; GBA manufacturing is opaque to them
3. **No factory-side product** — Lio only serves buyers, not factories
4. **No real-time capacity data** — can't tell clients which factories can fulfill TODAY
5. **No instant quote capability** — async by design; can't compete on speed for time-sensitive orders

---

## Three OpenFactory-Lio Scenarios

### Scenario A: Partnership (Best Case)
OpenFactory becomes Lio's GBA factory API layer.
- Lio's agents call `get_instant_quote()`, `place_order()`, `track_order()` via OpenFactory MCP
- Lio stops waiting 3 days for GBA factory responses
- OpenFactory earns per-transaction fee or annual API contract
- OpenFactory gets immediate access to Lio's 100+ Fortune 500 clients
- **Timeline to close**: 3-6 months (enterprise sales cycle)
- **Revenue potential**: If Lio processes even 1% of their "billions in managed spend" through OpenFactory at 1% take rate = $millions ARR

### Scenario B: Infrastructure Deal
Lio acquires or white-labels OpenFactory's GBA capacity layer.
- Lio markets "GBA Same-Day Sourcing" powered by OpenFactory
- OpenFactory gets guaranteed revenue and scale
- Less upside but faster to market
- **Timeline**: 6-12 months

### Scenario C: Parallel Competition
Lio builds their own factory API for GBA (unlikely short-term given NYC focus).
- 12-18 month minimum to replicate OpenFactory's China-side relationships
- Language/culture barrier for NYC team
- Qianhai support would give OpenFactory 2-3 year lead
- **OpenFactory's defense**: Relationships with verified factories + local presence + Qianhai government backing

---

## Competitor Comparison

| | Lio | Didero | Xometry | OpenFactory |
|--|-----|--------|---------|-------------|
| Side | Buyer-side | Buyer-side | Buyer-side | **Factory-side** |
| Geography | US enterprise | US/EU | US/EU | **GBA (China)** |
| Factory API | ❌ Email/WeChat | ❌ Email/WeChat | ❌ Instant quote US only | ✅ |
| MCP/AI-native | Partial | Partial | ❌ | ✅ |
| Real-time capacity | ❌ | ❌ | ❌ | ✅ |
| Funding | $33M | $30M | IPO'd | Seeking |
| Revenue | Not disclosed | Not disclosed | $400M+ | $0 (pre-revenue) |

**Key insight**: Every competitor is buyer-side. Nobody owns factory-side infrastructure.

---

## What This Means for OpenFactory Strategy

### The Pivot in One Sentence
**Stop competing with Lio. Become the infrastructure Lio runs on.**

### Current Product-Market Fit Score: 5.5/10
- Problem: Real (9/10)
- Timing: Perfect (8/10) — Lio's $30M proves the market is hot
- Buyer acquisition: Unnecessary (0/10) — Lio has the buyers
- Supply-side (factories): Fictional (1.5/10) — 20 seeded factories, zero real API integrations
- Developer tools (MCP): Strong (7/10) — npm package, 8 tools, works in Claude Desktop

### Priority Shifts Required
1. **STOP building buyer portal features** — Lio has the buyers
2. **START getting real factory API commitments** — 5 verified factories with real pricing rules
3. **START integration partnership with Lio** — cold email is drafted, needs sending
4. **BUILD factory capacity update UI** — factories must self-declare capacity via mobile
5. **PUBLISH npm package** — real install count validates developer traction for enterprise conversations

### The Qianhai Angle
Qianhai (Shenzhen free trade zone) is:
- Geographic hub for GBA manufacturing
- Government backing → factory trust → faster supply onboarding
- 50P compute credit → run MCP inference layer locally
- Office → base for in-person factory relationship building

The pitch reframe for Qianhai: *"Lio and Didero raised $60M to automate enterprise procurement but their AI agents still send emails to GBA factories. We're the factory-side API they need. We need Qianhai to build the supply."*

---

## Recommended OpenFactory Pivots (for CEO Review)

### Pivot 1: Rename the product positioning (IMMEDIATE)
- FROM: "Stripe for manufacturing" (too broad, too early)
- TO: "The factory-side API for AI procurement agents"
- Subheadline: "Lio's agents call `get_instant_quote()`. OpenFactory answers in 36ms."

### Pivot 2: Build "Lio-Ready Integration" page
- A dedicated landing page showing exactly how Lio/Didero agents would use OpenFactory
- Include working code sample: MCP tool call → instant quote response
- This is a 2-hour build but dramatically improves outreach conversion

### Pivot 3: Stop buyer-side feature development
- Buyer portal: done enough for demo
- Factory mobile: done enough for demo
- All remaining dev capacity → factory supply acquisition + API reliability

### Pivot 4: Add real pricing rules from real factories
- Current: 6 seeded factories with synthetic data
- Target: 5 real factories with their actual pricing curves
- Method: In-person visit to Longhua/Bao'an industrial districts (Shenzhen)

### Pivot 5: Ship the npm package
- `openfactory-mcp` is at `packages/openfactory-mcp/`
- Publish to npm = real install count = proof of developer demand
- This takes 30 minutes and has outsized credibility impact

---

## Action Sequence (prioritized)

| Priority | Action | Time | Impact |
|----------|--------|------|--------|
| 🔴 | Send Lio cold email (Vladimir Keil) | 10 min | Partnership conversation started |
| 🔴 | Send Didero cold email | 10 min | Partnership conversation started |
| 🔴 | Restart server (stuck on v0.2.0) | 5 min | Demo works |
| 🟡 | Publish `openfactory-mcp` to npm | 30 min | Developer credibility |
| 🟡 | Add "Lio-Ready Integration" page | 2 hours | Outreach conversion |
| 🟡 | In-person factory visit (Longhua) | 1 day | Real supply data |
| 🟢 | Send Qianhai pitch email | 30 min | Office + compute + funding |

---

_End of analysis — prepared for /plan-ceo-review_
