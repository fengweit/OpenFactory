# OpenFactory — Core Product Document
> Version 0.1 · March 2026 · Internal working document

---

## One Sentence

OpenFactory turns verified Shenzhen factories into MCP-native tools so AI agents can source, quote, order, and track physical manufacturing — programmatically, without humans.

---

## The Problem We're Solving

The world's procurement stack is being rebuilt around AI agents. Gartner forecasts $15 trillion in B2B spend will flow through AI agents by 2028. Enterprises are deploying autonomous procurement systems. Developers are building AI agents that can spin up cloud servers, book meetings, send contracts, and manage finances — all via tool calls.

But the moment that agent needs to order something physical from a factory, it hits a wall.

Alibaba requires a human to browse, message, negotiate in broken English, and manually place orders via a 1998-era web interface. Made-in-China.com is the same. There is no API. There is no schema. There is no way for code to touch manufacturing.

This is the last undigitized layer of global commerce. And it happens to sit right on top of the world's largest manufacturing ecosystem — the Greater Bay Area, centered on Shenzhen.

OpenFactory fixes this.

---

## What OpenFactory Is

OpenFactory is three things simultaneously:

**1. An MCP Server**
Factories are exposed as callable tools in the Model Context Protocol. Any AI agent running on Claude, GPT-4, Gemini, or any MCP-compatible runtime can call `search_factories`, `get_quote`, `place_order`, and `track_order` the same way it would call a database query or an API endpoint. Manufacturing becomes a tool call.

**2. A REST API**
The same capabilities are exposed over HTTP for non-MCP buyers, procurement software, ERPs, and developer integrations. Standard JSON in, standard JSON out. No portal, no login, no human in the loop.

**3. An Operations Layer**
The technology is easy. The hard part — and the real moat — is everything underneath it: physically visiting and verifying each factory, signing NDAs covering buyer IP, building the WeChat-native factory portal that translates API orders into something a Shenzhen factory owner can act on, holding payment in escrow, and owning the trust relationship between a global buyer and a Chinese manufacturer they've never met.

OpenFactory is the trust and operations infrastructure that makes the API meaningful.

---

## Core Mental Model

> Factories are to OpenFactory what cloud functions are to AWS Lambda.

Lambda didn't invent compute. It made compute callable. You describe what you want, it finds the right resource, executes, returns a result. You never think about the server.

OpenFactory doesn't invent manufacturing. It makes manufacturing callable. You describe what you need, it finds the right factory, gets quotes, executes the order, returns tracking. You never think about the supplier relationship.

The AI agent calling `get_quote` doesn't know or care that there's a factory owner in Longhua reading a WeChat notification on the other end. It just gets a price back in under 60 seconds.

---

## Who Uses It

### Primary — The Day-One Customer

**Solo hardware founders and small product teams** building physical products — consumer electronics gadgets, IoT devices, custom accessories, branded hardware.

They are already technical. They use Claude, Cursor, or similar AI coding tools daily. They are deeply comfortable with APIs and MCP. What they hate is the sourcing process: weeks of Alibaba messages, language barriers, no guarantees, no structure, no way to automate any of it.

They don't need a procurement manager. They need a tool call.

Concretely: a founder building a custom IoT sensor who needs 500 units with a specific enclosure should be able to describe that requirement to their AI agent and have quotes back in minutes, not weeks.

### Secondary — Phase 2 Expansion

- **Procurement AI agents** inside enterprises that need factory tool calls as part of their supply chain automation
- **E-commerce operators** scaling physical products from hundreds to tens of thousands of units
- **Trading companies** who want to add AI-native sourcing on top of their existing supplier networks

### The Factory Side

Shenzhen factories are family-owned, WeChat-first, and have zero international sales infrastructure. They have product capability but no channel to global buyers. OpenFactory gives them a structured digital storefront and qualified international order flow — without requiring them to learn English, build a website, or hire salespeople.

The factory never touches the API. They get a WeChat notification and a simple web portal. OpenFactory is the translation layer.

---

## The Four Core Tools

Everything OpenFactory does flows through four tool calls. These are the primitive operations that compose into any procurement workflow.

### `search_factories()`
**Input:** category, max MOQ, price tier, certifications required, lead time constraints, verified-only flag

**Output:** ranked list of matching factories with capability data — location, certifications, capacity, rating, lead time

**What it replaces:** hours of browsing Alibaba, reading supplier pages in machine-translated Chinese, filtering manually

---

### `get_quote()`
**Input:** factory ID, product description, quantity, target price, deadline

**Output:** unit price, total price, lead time, MOQ, quote validity window

**What it replaces:** sending a message on Alibaba, waiting 3 days for a response, getting a number with no structure

**Important nuance:** In POC, quotes are generated server-side from a pricing model. In production, this becomes async — the factory is notified, a human reviews the spec, and responds with a real quote within a defined SLA (target: 24 hours). The agent polls or receives a webhook.

---

### `place_order()`
**Input:** quote ID, buyer ID, confirmation

**Output:** order ID, status, escrow confirmation, estimated ship date

**What it replaces:** wire transfer to an unknown factory, hoping they ship, having no recourse if they don't

**Trust mechanism:** payment is held in escrow and released only after the buyer confirms receipt. The factory is notified via their portal and WeChat bot. Specs are locked to the order record — both sides have a paper trail.

---

### `track_order()`
**Input:** order ID

**Output:** current status, production milestones, tracking number when shipped

**What it replaces:** sending WeChat messages asking "is my order ready yet"

---

## The Trust Architecture

Trust is not a feature. It is the product. Without it, no buyer will send real specs to an unknown factory via an API. With it, OpenFactory becomes the only way a technical buyer would want to source.

### What We Own at MVP

- **Physical verification** — every listed factory is visited in person by the OpenFactory team before going live. We confirm they exist, they have the stated capacity, and they can actually produce what they claim.
- **NDA coverage** — every factory signs an NDA covering buyer IP and product specifications before onboarding. Specs sent via API are contractually protected.
- **Escrow** — payment is never sent directly to the factory. It clears through OpenFactory's escrow layer and is released only on buyer confirmation. Factory gets paid when buyer gets product.
- **Locked specs** — every order creates an immutable record of what was ordered, at what spec, at what price. Disputes have a paper trail.
- **Qianhai backing** — operating inside the Qianhai innovation zone provides institutional legitimacy, cross-border legal infrastructure, and factory network access.

### What Comes in Phase 2

- Third-party QC inspection integration (QIMA API) — independent quality check before payment release
- Factory performance ratings built from completed order history
- Formal IP protection agreements with legal enforceability in both China and the buyer's jurisdiction
- Buyer insurance for orders above a threshold

---

## The Workflow, End to End

This is the full flow for the phone case example — 800 custom-branded units, $3/unit budget, May 15 deadline.

```
[Slack / email / code]
  "We need 800 custom phone cases by May 15, budget $3/unit"
          │
          ▼
[AI Agent]
  Parses: category=electronics_accessories, qty=800,
          target_price=3.00, deadline=~52 days
          │
          ▼
[search_factories(category="electronics_accessories", max_moq=800, verified_only=true)]
  Returns: sz-001, sz-003, sz-005
          │
          ▼
[get_quote(sz-001, qty=800)] ──┐
[get_quote(sz-003, qty=800)] ──┤  (parallel)
[get_quote(sz-005, qty=800)] ──┘
  Returns: 3 quotes with prices, lead times, validity
          │
          ▼
[Agent compares: sz-005 wins — $2.85/unit, 28 days, rating 4.5, verified]
          │
          ▼
[place_order(quote_id=q-sz005-xxx, buyer_id=rist-001)]
  Returns: order_id=ord-abc123, status=pending, escrow_held=true
           estimated_ship_date=2026-04-21
          │
          ▼
[Factory notified via WeChat bot + portal]
  Factory owner sees: 800 units, spec locked, payment in escrow
          │
          ▼
[track_order(ord-abc123)] → "in_production"
[track_order(ord-abc123)] → "qc"
[track_order(ord-abc123)] → "shipped" + tracking number
          │
          ▼
[Buyer confirms receipt]
  Escrow releases to factory.
  Order complete.
  Zero humans involved on the buyer side.
```

Total elapsed: 52 days from order to delivery. Time spent by buyer: approximately 0 minutes after the initial goal was stated.

---

## What We Are Not

**We are not a marketplace.** Alibaba is a marketplace — browse, discover, message. OpenFactory is infrastructure. You don't browse it; your agent calls it.

**We are not a sourcing agent.** Sourcify and similar services put humans in the loop to manage the relationship. We eliminate that loop entirely for straightforward orders.

**We are not Xometry.** Xometry is US/EU factories, custom engineered parts, CAD-file-driven quoting. OpenFactory is GBA factories, consumer goods and electronics accessories, natural language + structured spec quoting. Different geography, different product category, different buyer persona, native to AI agents.

**We are not a QC company.** We don't manufacture. We don't inspect. We connect and we hold trust. QC is handled by third parties we integrate with.

---

## The Moat

Technology alone is not defensible. An LLM wrapper over Alibaba scraping is not OpenFactory. The moat is operational.

**Factory relationships** built through in-person visits are slow to replicate. Every factory that goes live on OpenFactory has been physically vetted, legally onboarded, and trained on the portal. That takes time and presence. A competitor copying the API has no factories.

**Trust infrastructure** — escrow, NDAs, dispute resolution — takes time to build legal weight. A new entrant has no track record, no case law, no buyer confidence.

**Data** — every completed order teaches us more about real pricing, real lead times, real factory reliability. Quotes become more accurate. Search becomes more relevant. This compounds.

**Network effects** — factories that produce well get orders. Factories that get orders improve their rating. Better ratings attract more buyers. More buyers attract more factories. The flywheel starts slowly but compounds.

The 18-month window is real. Alibaba will eventually build an agent-native API. Xometry will eventually expand to GBA. But right now, neither has done it, and the operational groundwork takes years. We start now.

---

## Revenue Model

OpenFactory makes money when manufacturing happens. There is no inventory risk, no fulfillment risk, no physical exposure.

| Stream | Rate | Notes |
|---|---|---|
| Order commission | 5–8% of GMV | Take rate on every placed order |
| Factory listing tier | $299+/month | Premium placement, analytics, priority in search results |
| Escrow float | 1–2% | Float income on payment held during production (4–8 week cycles) |

At scale, the commission is the dominant revenue driver. A portfolio of 100 factories each doing $50K/month in orders through the platform = $5M GMV/month = $300K–$400K monthly revenue at a 6–8% take rate. This is achievable within 18–24 months of serious factory onboarding.

---

## What Qianhai Unlocks

OpenFactory's single hardest problem is factory onboarding velocity. The technology can be built in weeks. Onboarding 100 verified factories takes years — unless you have institutional access.

Qianhai provides exactly that. As a government-backed innovation zone at the heart of the GBA manufacturing ecosystem, Qianhai has:

- Direct relationships with factories operating in and around the zone
- Cross-border payment and trade infrastructure that makes escrow and USD/RMB flows cleaner
- Legal and regulatory cover for the IP protection layer
- Institutional credibility that accelerates factory trust

The Qianhai OPC Mavericks Program, launched March 18, 2026, is explicitly designed for AI-driven solopreneurs building scalable businesses. OpenFactory is that program's ideal use case: one founder, AI as infrastructure, physical world impact, direct alignment with Qianhai's cross-border mandate.

---

## Open Questions (To Resolve Before Launch)

These are the decisions that need real answers, not assumptions:

1. **Async quote SLA** — what is the maximum time a factory has to respond to a quote request before the system marks it as timed out and moves to the next factory? Target: 4 hours during business hours.

2. **Escrow partner** — which payment provider handles USD intake and RMB payout to factories? Options: Stripe + local acquirer, Airwallex (built for cross-border), PingPong (CN-focused B2B).

3. **Minimum viable factory count for launch** — 5 factories in one vertical is enough for a POC demo. What's the minimum to charge real money and call it a product? Likely 15–20 across 2–3 verticals.

4. **Spec format** — how structured must specs be? Plain language works for simple products. Complex products need dimensional drawings, materials lists, tolerance specs. What's the input format and who validates it?

5. **Dispute resolution** — when an order arrives defective, what's the process? Who decides? This needs a written policy before the first real order.

6. **Factory portal language** — the portal is the factory's entire interface with OpenFactory. It needs to be in Mandarin, mobile-first, WeChat-native. Who builds and maintains it?

---

## Summary

OpenFactory is the MCP layer that the AI procurement revolution needs but doesn't yet have. The demand is proven, the gap is real, the timing is right, and the operational moat takes years to build — which means starting now is the only viable strategy.

The technology is straightforward. The trust infrastructure is hard. The factory relationships take time. Qianhai is the unlock.

The factory of the future has an API. We're building it.

---

*Contact: inqianhai@qhidg.com · Qianhai OPC Mavericks Program 2026*
