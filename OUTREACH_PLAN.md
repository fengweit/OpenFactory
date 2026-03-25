# OpenFactory — Outreach Plan (Week of March 24–28, 2026)

## Priority Targets

| # | Company | Contact | Channel | Send By | Status |
|---|---------|---------|---------|---------|--------|
| 1 | Lio | Vladimir Keil (CEO) | Email + LinkedIn | Wed Mar 26 | Draft ready |
| 2 | Didero | Tim Spencer (CEO) | Email + LinkedIn | Thu Mar 27 | Draft ready |
| 3 | Xometry | Partnerships team | Email | Fri Mar 28 | TBD |
| 4 | Qianhai OPC | inqianhai@qhidg.com | Email | Fri Mar 28 | Pitch ready |

---

## 1. Lio — Vladimir Keil (CEO)

**Why he'll respond:**
- YC founder — respects builders who ship fast
- Came from SAP, hates manual procurement workflow
- a16z just gave him $30M to scale — he's under pressure to show differentiation
- His agents are doing web scraping to find factories today. We have a structured API.

**Contact info:**
- Email: founders@asklio.ai
- LinkedIn: linkedin.com/in/vladimir-keil/
- Twitter/X: search @vladkeil

**Email (send Wed Mar 26):**

---
Subject: Your agents scrape the web for GBA factories. Here's the API instead.

Vlad,

Congrats on the a16z round. Read the announcement — "execute purchases end-to-end across ERPs, systems of record, inboxes, contracts, and the open web."

The open web part caught my eye. That means today, a Lio agent sourcing PCB assembly in Shenzhen is doing web searches, sending emails, waiting 3 days.

We built the structured API for that.

OpenFactory is an MCP server that makes Greater Bay Area factories callable:

```python
# Instead of web search + email + 3-day wait:
results = query_live_capacity("pcb_assembly", qty=5000)
# → 2 factories with available slots. Binding prices. 10ms.

quote = get_instant_quote("sz-006", qty=5000)
# → $4.20/unit, 21 days, $21,000. Valid 48h. 36ms.

order = place_order(quote.id)
# → Confirmed. $21,000 in escrow. Factory notified via WeChat.
```

20 verified factories across 8 GBA cities. Live escrow (Stripe). WeChat notifications to factory owners. MCP server your agents can call directly.

We're not competing with Lio — we're the factory API layer you need to stop sending emails to Shenzhen.

15 minutes? Happy to show you the MCP server live.

GitHub: https://github.com/fengweit/OpenFactory
Live demo: http://[server]:3000/agent.html

Fengwei "Yuqi" Tian
Sr. SWE @ Rippling | OpenFactory (building)
Previously: Amazon Seattle + London

---

**LinkedIn follow-up (if no email response in 3 days):**
Short note: "Hey Vlad — sent an email to founders@asklio.ai about a GBA factory API for Lio's agents. The open web sourcing problem has a better solution. Worth 15 min?"

---

## 2. Didero — Tim Spencer (CEO)

**Why he'll respond:**
- Ran Markai in Asia — he has WeChat contacts, he knows GBA factories
- His exact quote: "Global trade runs on natural language — emails, WeChat, phone calls"
- He knows this problem is unsolved because he lived it
- Microsoft M12 backing = pressure to show enterprise traction

**Contact info:**
- Email: Try hello@didero.ai or tim@didero.ai
- LinkedIn: Search "Tim Spencer Didero"
- PR contact for intro: Casey Larkin (Pesti Group)

**Email (send Thu Mar 27):**

---
Subject: You said "global trade runs on natural language." Here's the API version.

Tim,

Your quote from the TechCrunch piece: "Global trade runs on natural language communication — it's emails, WeChat, phone calls, purchase orders, and packing lists."

You built Markai in Asia. You know exactly what this looks like on the factory side — the WeChat threads, the 3-day quote turnarounds, the ghost factories.

We're turning that natural language chaos into API calls.

OpenFactory is a REST API + MCP server for Greater Bay Area factories:

- `query_live_capacity("pcb_assembly", qty=5000)` → 2 factories with open slots, binding prices, 10ms
- `get_instant_quote("sz-006", qty=5000)` → $4.20/unit, 21 days, binding for 48h
- `place_order(quote_id)` → escrow created, factory WeChat-notified instantly

Didero's agents currently ingest the emails/WeChat factories send back. What if those factories were on a structured API instead? Your agents skip the natural language parsing entirely — they call a function and get a typed response.

20 verified GBA factories, 8 cities (Shenzhen, GZ, Dongguan, Foshan, Huizhou, Zhongshan, Jiangmen, Zhuhai). Live escrow. Bilingual WeChat notifications. MCP-native.

I think there's a real integration here. Worth a quick call?

GitHub: https://github.com/fengweit/OpenFactory

Fengwei "Yuqi" Tian
Sr. SWE @ Rippling | OpenFactory
Previously: Amazon Seattle + London

---

## 3. Xometry — Partnerships

**Why relevant:**
- Instant quotes for custom manufacturing in US/EU (the model we're building for GBA)
- No GBA. No MCP server. No AI agent interface.
- Could be a channel partner (they refer US clients who need GBA sourcing → OpenFactory)
- Or: they might want to acquire/partner to cover GBA gap

**Email: partnerships@xometry.com (Fri Mar 28)**

Subject: GBA manufacturing capacity for your enterprise clients — partnership proposal

---

## 4. Qianhai OPC Mavericks

**Email: inqianhai@qhidg.com (Fri Mar 28)**

Updated pitch: "Lio and Didero just raised $60M to automate procurement. Neither has the factory API. We're building it from Qianhai."

See QIANHAI_PITCH.md for full email.

---

## Follow-up Schedule

| Day | Action |
|-----|--------|
| Mon Mar 23 | Prep drafts (done) |
| Wed Mar 26 | Send Lio email |
| Thu Mar 27 | Send Didero email |
| Fri Mar 28 | Send Xometry + Qianhai |
| Mon Mar 31 | LinkedIn follow-up if no response |
| Wed Apr 2 | Second email follow-up (Lio/Didero) |

---

## What to have ready before sending

- [ ] GitHub repo public and README polished ✅
- [ ] Live demo accessible (or video recording) 
- [ ] agent.html shows live capacity query ✅
- [ ] One real factory responding to quotes (target: before Lio email)
- [ ] Deck PDF for attachment (in progress)

---

## Response handling

**If Lio/Didero say "interested in a call":**
1. Confirm 15-min slot
2. Prep: show live MCP tool calls from Claude Desktop → OpenFactory API
3. Have query_live_capacity running live during demo
4. Ask: "What does your agent do today when it needs to source from Shenzhen?"

**If Lio/Didero say "not a fit":**
Ask for intro to their head of partnerships or someone on their sourcing/supplier side.

**If no response in 1 week:**
Post on LinkedIn about OpenFactory + MCP + GBA capacity. Tag Lio/Didero. Let content do the work.
