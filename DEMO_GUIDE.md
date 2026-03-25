# OpenFactory — Demo Guide
_For CEO outreach (Lio / Didero) and Qianhai OPC pitch_
_Last updated: 2026-03-25_

---

## Before You Start (2 min setup)

1. **Server running?** Open Terminal: `curl http://localhost:3000/health` → should say `"status": "ok", "version": "0.3.0"`
   - If not: `launchctl start com.openfactory.api`
2. **Open these tabs** in Chrome before the call:
   - `http://localhost:3000/` — landing page
   - `http://localhost:3000/lio-ready.html` — the CEO slide
   - `http://localhost:3000/agent.html` — MCP tool demo
   - `http://localhost:3000/factory-mobile.html?f=sz-005` — factory owner view
   - `http://localhost:3000/admin.html` — platform overview
3. **Have Terminal ready** for the live API commands below

---

## The One-Sentence Pitch

> "Lio and Didero raised $60M to automate enterprise procurement —
> but their AI agents still email GBA factories and wait 3 days.
> OpenFactory is the factory-side API they plug into.
> Quotes in 36ms. Orders with escrow. No email."

Say this in the first 30 seconds. Everything else is proof.

---

## Demo A — For Lio / Didero CEOs (15 min)

**Audience:** Vladimir Keil (Lio CEO), Didero team
**Goal:** Get a technical call scheduled. Show them this is a real integration, not a pitch deck.
**Tone:** Engineer-to-engineer. Fast. No fluff.

---

### Act 1: The Problem (2 min)

**What to say:**
> "Right now, when your agent needs a quote from a Shenzhen factory, what happens?
> It sends an email or a WeChat message. Then it waits. Could be 2 hours, could be 3 days.
> Your agent is blocked. Your procurement workflow stops.
> That's the last mile we're fixing."

**Show:** Nothing yet. Just talk. Let the problem land.

---

### Act 2: The API (5 min)

**Open:** `http://localhost:3000/lio-ready.html`

**What to say:**
> "This is what a Lio integration looks like."

**Point to the code block on the page:**
```python
# Step 1: Find factories with open capacity RIGHT NOW
results = mcp.call("query_live_capacity", {
  "category": "pcb_assembly",
  "quantity": 5000
})
# → 2 factories, prices, available slots. 10ms.

# Step 2: Get a binding quote
quote = mcp.call("get_instant_quote", {
  "factory_id": "sz-006",
  "category": "pcb_assembly",
  "quantity": 5000
})
# → $4.20/unit · 21 days · $21,000 total · confidence 0.98. 36ms.

# Step 3: Place the order
order = mcp.call("place_order", {
  "quote_id": quote.id,
  "buyer_id": "your-client-id"
})
# → Order confirmed. $21,000 in escrow. Factory WeChat-notified. Done.
```

**Then click the "Call get_instant_quote() Live" button on the page.**

You'll see the real API response appear in ~36ms:
```json
{
  "unit_price_usd": 4.20,
  "total_price_usd": 21000,
  "lead_time_days": 21,
  "confidence": 0.98
}
```

**What to say:**
> "That's a real API call to a real factory's pre-declared pricing rules.
> No email sent. No human involved. 36 milliseconds."

---

### Act 3: Live Terminal (3 min)

Open Terminal. Run these one at a time, let them watch:

**Query live capacity:**
```bash
curl "http://localhost:3000/capacity?category=pcb_assembly&qty=5000" | python3 -m json.tool
```
Expected: 2 factories with prices, capacity slots, lead times.

**Get instant quote:**
```bash
curl "http://localhost:3000/factories/sz-006/instant-quote?category=pcb_assembly&qty=5000" | python3 -m json.tool
```
Expected: `$4.20/unit · 21 days · $21,000 · confidence 0.98`

**What to say after:**
> "This is what your agent calls instead of sending an email.
> Same result. 3 days faster."

---

### Act 4: The MCP Tools (2 min)

**Open:** `http://localhost:3000/agent.html`

**What to say:**
> "For Claude Desktop or any MCP-compatible agent, it's one npm install:
> `npx openfactory-mcp` — it's live on npm right now.
> Eight tools. Your agent gets all of these."

Point to the tools list:
- `search_factories` — find verified GBA factories
- `get_instant_quote` ⚡ — sub-100ms binding quote
- `query_live_capacity` ⚡ — factories available RIGHT NOW
- `get_quote` — async RFQ for complex requirements
- `place_order` — with USD escrow
- `track_order` — production milestones
- `update_order_status` — factory-side
- `get_analytics` — platform metrics

---

### Act 5: The Ask (3 min)

**What to say:**
> "We have 20 verified GBA factories across 8 cities.
> The architecture is built for an enterprise integration partner.
> You have the buyers — 100+ Fortune 500 clients.
> We have the factory API.
>
> I want to build a Lio-specific integration. One API key,
> and your agents stop waiting for email replies on GBA sourcing.
>
> Can we get 30 minutes with your engineering team this week?"

**Stop talking.** Wait for their response.

---

## Demo B — For Qianhai OPC Mavericks (20 min)

**Audience:** Qianhai government program reviewers
**Goal:** Office space + compute grant + talent award
**Tone:** Confident founder, strategic framing, show traction

---

### Opening (2 min)

**What to say:**
> "Two companies just raised $60M in 6 weeks to automate enterprise procurement with AI.
> Lio got $30M from Andreessen Horowitz in March.
> Didero got $30M from Microsoft M12 in February.
>
> Both companies automate the buyer side beautifully.
> Neither has solved the factory side.
> Their agents still email factories in Longhua and wait.
>
> OpenFactory is the factory-side API.
> We turn GBA factories into callable tools for AI procurement agents.
> And the only place to build this is here — in Qianhai."

---

### Show the Full Stack (10 min)

**Screen 1 — The landing page:** `http://localhost:3000/`

> "This is what an AI procurement agent sees. One API endpoint. GBA factories callable in milliseconds."

Key numbers to point out:
- 20 verified factories, 8 cities
- $260,290 demo GMV
- Live API, 8 MCP tools

---

**Screen 2 — Live capacity query in Terminal:**
```bash
curl "http://localhost:3000/capacity?category=pcb_assembly&qty=5000"
```

> "10 milliseconds. Instead of emailing a factory in Dongguan and waiting,
> an AI agent gets this response instantly. This is what 'factory-side API' means."

---

**Screen 3 — Factory owner experience:** `http://localhost:3000/factory-mobile.html?f=sz-005`

> "This is what the factory owner sees on their phone.
> WeChat notification arrives — they tap, land here, no login required.
> They see the RFQ, tap 'Accept', set their price.
> The whole thing works on a ¥2,000 smartphone over WeChat."

Walk through the tabs:
- **询价** — incoming quote requests
- **订单** — active orders with escrow status
- **数据** — factory performance stats
- **产能** — factory declares available capacity and pricing (new)

---

**Screen 4 — Admin dashboard:** `http://localhost:3000/admin.html`

> "Platform-wide view. All factories, all quotes, pending onboarding applications.
> This is what the operations team sees when we're running at scale."

---

**Screen 5 — Factory onboarding:** `http://localhost:3000/onboard.html`

> "When we walk into a factory in Bao'an, this is the form we hand them on a tablet.
> 4 steps. They set their category, capacity, minimum order, pricing.
> They're on the platform in 10 minutes.
> The Qianhai office means we can run this in-person at scale."

---

### The Stack Diagram (2 min)

Draw this on a whiteboard or show it from the pitch:

```
FORTUNE 500 BUYERS
        ↓
[ Lio / Didero — $60M raised ]   ← buyer-side AI agents
        ↓
[ OpenFactory API ]               ← THIS IS US (Qianhai)
        ↓
GBA FACTORIES
Shenzhen · Guangzhou · Dongguan · Foshan · Huizhou · 8 cities
```

> "We're not competing with Lio. We're the infrastructure they run on.
> One API integration with Lio = instant access to their 100+ Fortune 500 clients.
> That's the business model."

---

### Traction Slide (2 min)

| What | Status |
|------|--------|
| REST API + MCP server (8 tools) | ✅ Live |
| 20 verified GBA factories, 8 cities | ✅ Live |
| `query_live_capacity` — 10ms | ✅ Live |
| `get_instant_quote` — 36ms | ✅ Live |
| Escrow architecture (Stripe) | ✅ Live |
| WeChat factory notifications | ✅ Live |
| `openfactory-mcp` on npm | ✅ Published |
| Factory mobile portal (Mandarin) | ✅ Live |
| API documentation (21 endpoints) | ✅ Live |
| GitHub: fengweit/OpenFactory | ✅ Public |
| Built in: 72 hours | ✅ |

---

### The Ask (2 min)

> "The agentic procurement stack is forming right now.
> Lio and Didero have the buyers. We need the supply.
> The window to own GBA factory infrastructure closes in 18 months.
>
> We need three things from Qianhai that money can't buy on this timeline:
>
> One — physical proximity. Qianhai is 20 minutes from 50,000 GBA factories.
> We need to be in the room with factory owners, not emailing them.
>
> Two — the FTZ. Clean USD/RMB escrow flows require the regulatory wrapper
> that only Qianhai can provide.
>
> Three — credibility. '我们是前海的初创公司' changes every factory conversation.
>
> We're asking for: the office space, the compute allocation, the talent award.
> In return: we become the factory-side API layer that puts GBA manufacturing
> on the map for every AI procurement platform in the world."

---

## Common Questions + Answers

**"Why haven't Lio/Didero built this themselves?"**
> "They're NY-based, buyer-focused, just closed their rounds. Building factory relationships in Shenzhen takes years and Mandarin fluency. That's exactly our advantage — and why Qianhai is the right base."

**"What's your revenue model?"**
> "API transaction fee — 0.5–1% of GMV on orders placed through OpenFactory. At $1M GMV that's $5–10K/month. Lio manages billions in spend — even capturing 0.1% of their GBA volume is significant."

**"How many real factories do you have?"**
> "20 in the demo database. Zero with signed commercial agreements yet — that's what the Qianhai office unlocks. The product is built. We need boots on the ground to convert the demo into real supply."
>
> *(Don't hide this. Investors respect honesty. The product existing is the proof — supply acquisition is the next step.)*

**"Why not just build a marketplace?"**
> "Alibaba owns the marketplace. We're infrastructure — like AWS, not Amazon.com. Lio's agents don't need a marketplace UI, they need an API. That's the gap nobody has filled."

**"Can you show the MCP working in Claude Desktop?"**
> "Yes — one second." Run: `npx openfactory-mcp` in Terminal. Then open Claude Desktop and show the tools available. (Only works if Claude Desktop is configured with the MCP server.)

---

## Key Numbers to Remember

| Metric | Value |
|--------|-------|
| `get_instant_quote` response time | 36ms |
| `query_live_capacity` response time | 10ms |
| Verified GBA factories in demo | 16 of 20 |
| Cities covered | 8 (Shenzhen, GZ, DG, Foshan, Huizhou, Zhongshan, Jiangmen, Zhuhai) |
| Demo GMV | $260,290 |
| npm package | `npx openfactory-mcp` |
| GitHub | github.com/fengweit/OpenFactory |
| Lio raised | $30M (a16z, March 2026) |
| Didero raised | $30M (Microsoft M12, Feb 2026) |
| Combined signal | $60M in 6 weeks = proven demand |

---

## If Something Breaks

| Problem | Fix |
|---------|-----|
| Server not responding | `launchctl start com.openfactory.api` then wait 5 sec |
| Live button on lio-ready.html shows error | The button calls localhost — works on your machine, not remotely. Switch to Terminal demo |
| factory-mobile.html blank | Add `?f=sz-005` to the URL |
| Slow API response | Normal on first call (SQLite cold start). Run the curl command once first to warm it up |

---

## The 60-Second Version

If you only have 1 minute:

1. Open Terminal
2. Run: `curl "http://localhost:3000/factories/sz-006/instant-quote?category=pcb_assembly&qty=5000"`
3. Show them the response: `$4.20/unit, 21 days, $21,000, 36ms`
4. Say: *"That's what your agent gets instead of sending an email and waiting 3 days."*
5. Say: *"We have 20 factories. We need your API key to make this work with your clients."*
6. Stop talking.

---

_End of demo guide — OpenFactory v0.3.0_
