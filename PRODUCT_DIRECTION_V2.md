# OpenFactory — Product Direction V2
## Strategic Proposal: The Intelligence-First POC
_Prepared by Clio · March 26, 2026 · For CEO Review_

---

## Executive Summary

OpenFactory's original vision — a full transaction layer (quote → payment → fulfillment) — runs into three problems that are each independently hard enough to kill a solo-founder company: **buyer trust, cross-border payment, and shipping logistics**. Trying to solve all three simultaneously is a trap.

This proposal argues that we don't need to solve any of them to build a fundable, traction-generating, Lio-partnerable product in the next 30 days.

**The pivot:** Drop the transaction. Keep the intelligence.

---

## The Three Problems, Honestly Assessed

### Problem 1: Trust

**Buyer side:** For a Fortune 500 company to place a real order with an unknown Shenzhen factory via an API, they need:
- Verified factory credentials (certifiable, not just "we visited once")
- Escrow protection backed by legal recourse in both jurisdictions
- QC inspection from a trusted third party
- IP protection with enforceable NDAs across US and Chinese law
- A track record — completed orders, dispute resolution history
- Insurance

Each of these is months of work and legal/compliance overhead. As a solo founder, you can fake some of this for a demo. You cannot fake it for a real order from a real Lio client.

**Seller (factory) side:** A Shenzhen factory owner will talk to you. Getting them to (a) share real pricing data, (b) commit real capacity, and (c) keep updating it reliably requires ongoing relationship management. The onboarding is one visit; the maintenance is a job. One person cannot manage 20+ real factory relationships while also building product.

**Honest verdict:** Full two-sided trust infrastructure is a 12-18 month build at minimum. Not the POC.

---

### Problem 2: Payment

Cross-border USD → CNY payment is a regulated activity. The problems:
- **US-China tariffs (2025-2026):** Section 301 tariffs + additional tariffs now stack to 25-145%+ on many electronics/goods categories. The tariff situation is actively getting worse, not better. Every order carries hidden cost exposure.
- **FX risk:** RMB/USD fluctuation on a 4-8 week escrow cycle creates real exposure.
- **Banking infrastructure:** Stripe doesn't do CNY payouts to Chinese businesses. Airwallex and PingPong can, but require compliance setup, AML/KYC processes, and banking partnerships you don't have yet.
- **Money transmission:** State-level licensing in the US, plus compliance with Chinese payment regulations.

**Honest verdict:** Cross-border payments for B2B manufacturing are an entire industry. This is not something to build from scratch. Not the POC.

---

### Problem 3: Shipping and Cross-Border Logistics

Even if trust and payment are solved, every order has to physically move from China to the buyer:
- **Who is the importer of record?** This determines tariff liability and customs responsibility.
- **Incoterms:** FOB? DDP? CIF? Each shifts liability and cost in different ways.
- **Customs clearance:** HTS codes, country of origin rules, customs bonds, broker fees.
- **De minimis elimination:** The US eliminated the China de minimis exemption in 2025 — every shipment from China now clears full customs, no exceptions.
- **Product compliance:** FCC, CE, UL certifications — required before products can ship.
- **Returns:** When a shipment arrives wrong or damaged, who handles it?

**Honest verdict:** This is the customs brokerage + freight forwarding industry. You cannot substitute that with an API. Not the POC.

---

## The Reframe: What Does Lio Actually Need?

Let's be precise about this, because it matters.

Lio doesn't need OpenFactory to **execute** procurement. They need OpenFactory to **inform** procurement decisions.

The 3-day wait isn't blocking Lio from placing orders. They have enterprise procurement processes for that — existing supplier agreements, legal review, payment terms, freight accounts. What their AI agents can't do programmatically is **the sourcing step**: find factories that can do this, get a price range, understand lead time, compare options.

That sourcing intelligence step is what takes 3 days when done via email. That's what OpenFactory can compress to 36 milliseconds.

The actual purchase order, the wire transfer, the freight quote — Lio's clients have departments for that.

**This is the key insight that unlocks the POC:**

> Lio needs the intelligence, not the execution. OpenFactory can deliver the intelligence without touching money, shipping, or enforcement.

---

## The POC: Manufacturing Intelligence API

### What It Is

OpenFactory V1 is a **read-only manufacturing intelligence layer**:

- **Factory discovery:** Search verified GBA factories by category, MOQ, certifications, capacity
- **Instant price signals:** Pre-declared pricing ranges from real factories (e.g., "PCB assembly: $3.20–$6.80/unit for 500–20,000 units, MOQ 500")
- **Live capacity signals:** Green/yellow/red availability per category, updated weekly by factory contacts
- **Lead time estimates:** Sample vs. production lead times, current queue depth

### What It Is NOT

- ❌ No order placement
- ❌ No payment or escrow
- ❌ No shipping coordination
- ❌ No QC inspection
- ❌ No dispute resolution
- ❌ No cross-border transaction of any kind

### What Happens After a Quote

When a buyer's agent calls `get_instant_quote()` and gets a price, the natural next step is a warm introduction:

> "This quote is indicative. To proceed, contact factory sz-006 directly — here's their verified contact and your RFQ reference number."

The factory handles the actual negotiation and order in their existing way. OpenFactory provides the intelligence that gets the buyer to the right factory, fast. The factory handles the close.

This is how Bloomberg Terminal works: it gives you the pricing intelligence to make a decision. It doesn't execute your trade.

---

## Why This Still Gets Traction

**For Lio:** Their agents go from "wait 3 days for an email" to "get pricing signals in 36ms and a warm intro to the right factory." That's still a 10,000x improvement. The AI agent makes the sourcing decision programmatically. The actual PO flows through Lio's existing procurement stack.

**For factories:** It's free marketing. They list their capabilities and pricing ranges. Qualified, pre-screened buyers query them. When a buyer wants to proceed, they get a warm introduction. No downside, pure upside. The factory doesn't have to trust OpenFactory with anything — they just fill out a pricing profile once.

**For OpenFactory:** You're in the software business, not the trade business. No cross-border payment infrastructure. No shipping liability. No dispute resolution. No tariff exposure. Pure API revenue.

---

## The Trust Solution for This POC

The trust problem collapses dramatically when you're selling intelligence, not fulfillment:

**Buyer trust:** You're providing *price signals*, not binding guarantees. The disclaimer is simple: "Prices are indicative based on factory-submitted pricing rules. Confirm directly with factory for binding quote." Buyers understand this — it's like how Zillow shows a Zestimate but you still negotiate the actual price.

**Factory trust:** You're asking factories to share a pricing range — something most factories would put on their website if they had one. "Tell us your price range for 500–10,000 units of PCB assembly." That's not sensitive. That's a sales tool. You're essentially their English-language, API-accessible brochure.

**What you DO need to credibly claim:**
- Physical verification of each factory (you visited and confirmed they're real)
- Basic capability validation (they showed you products they've made)
- Factory profile is signed off by the factory owner

That's achievable in one trip to Shenzhen. That's the real work of V1.

---

## Revenue Model for V1

No transaction, no GMV-based commission. Instead:

| Tier | Who | What | Price |
|------|-----|------|-------|
| API Subscription — Starter | Indie devs, small teams | 1,000 queries/month, 10 factory profiles | $199/month |
| API Subscription — Pro | Mid-sized procurement platforms | 10,000 queries/month, 20 factories, webhook events | $999/month |
| API Subscription — Enterprise | Lio, Didero, ERPs | Unlimited queries, dedicated support, SLA, custom integration | $2,000–$10,000/month |
| Data License | Research firms, analysts | Annual factory intelligence data license | $15,000–$50,000/year |

**The Lio math:** If Lio pays $5,000/month for API access, that's $60K ARR from one deal. One deal covers 6+ months of solo-founder runway.

**The factory listing:** Free forever for factories. This is how you get supply without paying for it.

---

## What This Means for the Product

### Keep Building

- `get_instant_quote()` — ✅ already built, perfect
- `query_live_capacity()` — ✅ already built, perfect
- `search_factories()` — ✅ already built, needs real data
- Factory profile pages — ✅ need real data
- MCP server + npm package — ✅ already published

### Change

- **Remove order placement from the V1 pitch.** `place_order()` still exists in the API — but it's not the hook. The hook is the intelligence layer. When Lio asks "what can you do," the answer is: "instant price signals, live capacity, verified factory profiles." Not "full escrow-protected orders."
- **Pricing model:** Remove GMV commission as the primary model. Replace with API subscription pricing page.

### Add (Minimal)

- **Pricing ranges in factory profiles** — instead of single price points, show ranges: "500 units: $4.20–$5.50/unit · 5,000 units: $3.10–$3.80/unit." More honest, less liability.
- **"Proceed with this factory" CTA** — when a quote is returned, add a warm intro mechanism: generate an email template with the RFQ summary, addressed to the factory contact. Zero infrastructure, pure value.
- **Capacity signal UI for factories** — a single-page mobile form where factory contacts update their capacity status weekly (green/yellow/red by category). Reachable via WhatsApp/WeChat link. No login required. This is the data freshness mechanism.

---

## The Expansion Path (Not Now, But This Is Where It Goes)

**V2: RFQ Routing**
OpenFactory actively routes structured RFQ requests to 3-5 matched factories, collects their responses (email/WeChat), normalizes them into JSON, and returns them to the buyer's agent. Revenue: per-RFQ fee ($10–$50). Still no payment, no shipping.

**V3: Facilitated Introduction**
OpenFactory vets buyers (KYC-light), introduces them to factories under a structured LOI template, and takes a referral fee from the factory when an order closes. Revenue: 2–3% of first order value. Still no money touches OpenFactory.

**V4: Managed Transactions**
Partner with Airwallex or PingPong for payment rails. Partner with a licensed freight forwarder for shipping. OpenFactory coordinates but doesn't hold money or goods. Revenue: percentage of GMV. This is the original vision — but with proven partners, proven track record, and proven demand.

The intelligence layer is not a detour from the original vision. It is the foundation. You can't build trust with buyers and factories without a track record. A track record requires real interactions. Real interactions are easiest to get when you're just providing data, not facilitating trade.

---

## 30-Day Sprint to V1 POC

### Week 1 — Reframe the Story (No Code)
- [ ] Update landing page: lead with "Manufacturing Intelligence API" framing
- [ ] Update README and pitch deck: lead with intelligence layer, not transaction layer
- [ ] Add pricing page: $199/$999/$2,000 API subscription tiers
- [ ] Update Lio outreach email: "Your agents get instant GBA factory pricing signals — no email, no waiting"
- [ ] Send Lio email with new framing

### Week 2 — One Real Factory
- [ ] Visit one factory in Shenzhen (physically verify, get pricing data)
- [ ] Replace all seeded data for that factory with real numbers
- [ ] Document what it actually takes to get real pricing data from one factory
- [ ] This answers: how many factories can one person realistically maintain?

### Week 3 — The Capacity Signal System
- [ ] Build factory capacity update form: mobile-first, no login, one click to update green/yellow/red
- [ ] Distribute to 5 factory contacts via WeChat: "Update this weekly, get free buyer leads"
- [ ] This is the core operational infrastructure of V1

### Week 4 — Demand Test
- [ ] Send demo to Lio, Didero, Qianhai
- [ ] Offer 3-month free API trial in exchange for feedback
- [ ] Measure: do they integrate? Do they query? Do they pay after the trial?
- [ ] The answer tells you whether this POC has product-market fit

---

## What Success Looks Like in 30 Days

| Signal | What It Means |
|--------|--------------|
| One integration call booked with Lio or Didero | Real demand exists for the intelligence layer |
| 5 real factories with real pricing data | Supply side is solvable |
| 50+ npm installs of openfactory-mcp | Developer community interest |
| One paid API subscription (any tier) | Revenue model is viable |

You need one of these. Ideally two. If you get none of them in 30 days, the problem isn't product — it's distribution, and the fix is channel, not features.

---

## Why This Is the Right V1

The original OpenFactory vision is correct. The market is real. The timing is right. The moat is operational.

But a full transaction layer requires legal, financial, and logistics infrastructure that takes years and capital to build. Attempting it as a solo pre-revenue founder is a trap — it makes the product too complex to demo, too risky to adopt, and too slow to build.

The intelligence layer strips all of that away. It's buildable by one person. It's adoptable by risk-averse enterprise buyers. It demonstrates the core value proposition (GBA factories, programmatic access, real-time data) without the operational complexity.

Most importantly: it creates the traction and relationships that make V2 possible. You can't skip to the full vision. But you can get there faster by starting simpler.

**The factory of the future has an API. Start with the intelligence. The transactions follow.**

---

_Document status: DRAFT for CEO review · Prepared by Clio · March 26, 2026_
_Next review: After Lio outreach response or Week 1 factory visit_
