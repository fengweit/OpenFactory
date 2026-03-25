# OpenFactory — Partnership Outreach

## Target: Lio (Vladimir Keil, CEO)
**Contact:** founders@asklio.ai
**Why now:** $30M Series A from a16z 3 weeks ago. 100+ Fortune 500 clients.
**Angle:** We're the GBA factory-side API their agents need to stop emailing suppliers.

---

### Email to Vladimir Keil — Lio

**Subject:** Your agents email GBA factories and wait. We fixed that.

Vladimir,

Congrats on the a16z round. Read the TechCrunch piece — "collapses weeks of work into minutes." That's exactly what we're building, but for the factory side.

Here's the gap I keep seeing: Lio's agents still send emails or WeChat messages to suppliers and wait 2–3 days for a quote. The last mile — actually reaching a Shenzhen factory and getting a binding response — is still human-speed.

We're fixing that.

OpenFactory is a REST API + MCP server that makes Greater Bay Area factories callable:

```python
# Instead of Lio sending an email to a factory and waiting:
quote = mcp.call("get_quote", {
  "factory_id": "sz-006",
  "product": "IoT sensor PCB",
  "quantity": 5000
})
# → $4.20/unit, 23 days, $21,000 total. Binding. In <1 second.
```

We have 20 verified GBA factories across 8 cities (Shenzhen, Guangzhou, Dongguan, Foshan, Huizhou, Zhongshan, Jiangmen, Zhuhai), a live MCP server, escrow architecture, and WeChat-native factory notifications.

The vision: any procurement agent — including Lio — plugs into OpenFactory and gets instant, programmatic access to GBA manufacturing capacity. You stop waiting for email replies. Your agents get quotes in milliseconds.

Would love 20 minutes to show you the MCP server live. Happy to build a Lio-specific integration.

GitHub: https://github.com/fengweit/OpenFactory
Live demo: http://[server]:3000/agent.html

Fengwei "Yuqi" Tian
Sr. SWE @ Rippling | OpenFactory (building)
Previously: Amazon Seattle + London


---

## Target: Didero
**Contact:** hello@didero.ai (or via LinkedIn)
**Angle:** "Global trade runs on natural language" — we turn GBA factory negotiations into API calls.

---

### Email to Didero

**Subject:** You said "global trade runs on natural language." We're turning GBA factories into API calls.

Hi,

Your CEO's quote from the TechCrunch piece stuck with me: "Global trade runs on natural language communication — emails, WeChat, phone calls."

That's exactly the problem we're solving on the supply side.

Didero automates procurement workflows beautifully. But your agents still send emails and WeChat messages to GBA factories and wait days for quotes. The factory side is still natural language — unstructured, async, human-speed.

OpenFactory makes GBA factories callable:

- REST API: `POST /quotes` → factory gets WeChat notification → responds via magic link
- MCP server: any AI agent calls `get_quote()`, `place_order()`, `track_order()` directly
- Escrow: $USD held until buyer confirms receipt
- 20 verified factories across Greater Bay Area

We're the structured API layer on top of the factory-side chaos you described.

Integration would look like this: Didero's agent receives a purchase request for PCB assemblies → calls OpenFactory's MCP tool → gets instant quotes from 3 verified Shenzhen factories → places order with escrow protection → tracks production milestones. No email. No waiting.

Worth a quick call?

GitHub: https://github.com/fengweit/OpenFactory

Fengwei "Yuqi" Tian


---

## Target: Xometry (stretch)
**Angle:** They have instant quotes for US/EU custom manufacturing. Zero GBA. No MCP.
**Ask:** Partnership to cover GBA for their enterprise clients.
**Contact:** partnerships@xometry.com


---

## Follow-up tracking

| Company | Contact | Sent | Response | Status |
|---------|---------|------|----------|--------|
| Lio | founders@asklio.ai | 2026-03-25 | — | Compose opened — awaiting send |
| Didero | hello@didero.ai | 2026-03-25 | — | Compose opened — awaiting send |
| Qianhai | inqianhai@qhidg.com | 2026-03-25 | — | Compose opened — awaiting send |
| Xometry | partnerships@xometry.com | — | — | TBD |


---

## Why this changes the Qianhai pitch

Before: "We connect foreign buyers to GBA factories."
After: "Lio and Didero just raised $60M to automate enterprise procurement. Their agents still
send emails to GBA factories and wait. We're building the factory-side API they plug into.
Demand is proven. We need Qianhai to build the supply."

This means:
- OpenFactory doesn't need to find buyers — Lio/Didero have 100+ Fortune 500 clients already
- One API integration with Lio = instant access to their entire GBA sourcing pipeline
- The $60M validates the market. OpenFactory is the missing infrastructure piece.
