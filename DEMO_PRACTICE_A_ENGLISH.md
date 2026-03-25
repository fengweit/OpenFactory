# Demo A — Practice Script
## For: Lio CEO (Vladimir Keil) / Didero team
## Language: English | Duration: 15 min | Format: Video call or in-person

---

> **How to use this:** Read every line out loud. The words in [brackets] are actions, not things to say.
> Practice until Act 2 and 3 feel natural — those are the ones where things can go wrong live.

---

## BEFORE THE CALL (5 min prep)

[Open these 4 tabs in Chrome, in this order:]
- Tab 1: `http://localhost:3000/lio-ready.html`
- Tab 2: `http://localhost:3000/agent.html`
- Tab 3: Terminal (cd into OpenFactory folder)
- Tab 4: `http://localhost:3000/factories.html`

[Pre-warm the API so there's no cold-start lag:]
```bash
curl "http://localhost:3000/capacity?category=pcb_assembly&qty=5000" > /dev/null
curl "http://localhost:3000/factories/sz-006/instant-quote?category=pcb_assembly&qty=5000" > /dev/null
```

[Check your audio. Mute notifications. Close Slack.]

---

## OPENING — 30 seconds

[Start sharing your screen. Show nothing yet — just your face or a blank screen.]

Say:

> "Thanks for making time. I'll keep this tight — 15 minutes, and I'll show you
> something live, not slides.
>
> Quick context: I've been watching what Lio is building, and I think there's
> a gap at the end of your procurement workflow that I've already built a solution for.
> Let me just show you."

[Switch to Tab 1 — lio-ready.html]

---

## ACT 1 — THE PROBLEM (2 min)

[Keep lio-ready.html visible. Point to the hero text on the page.]

Say:

> "When your agent finishes evaluating suppliers and needs a quote from a factory
> in Shenzhen — what actually happens today?"

[Pause. Let them answer. They'll say something like "we send an email" or "the agent sends a request."]

[After they answer, say:]

> "Right. The agent sends an email or a WeChat message to a factory contact.
> Then it waits. Two hours if you're lucky. Two days on average. Sometimes three.
>
> Your agent is blocked. The whole procurement workflow stops at the last mile —
> the moment it actually has to touch a GBA factory.
>
> That's what we fixed."

[Pause one beat. Let that land.]

---

## ACT 2 — THE LIVE DEMO (5 min)

[Tab 1 is still open — lio-ready.html]

Say:

> "This is what a Lio integration looks like. I'm going to walk through it,
> then I'll run it live so you can see the actual response."

[Point to the code block on the page. Read through it slowly:]

> "Step one — your agent calls query_live_capacity with a category and quantity.
> It gets back a list of factories that have open production slots right now.
> Not a directory — live availability.
>
> Step two — get_instant_quote on the factory you want.
> Your agent gets back a unit price, total, lead time, and a confidence score.
> This is a binding quote, valid 48 hours.
>
> Step three — place_order. Payment held in escrow until your client confirms receipt.
> The factory gets a WeChat notification the moment the order is placed."

[Now scroll down to the live demo section on the page.]

Say:

> "Let me run step two right now."

[Click the 'Call get_instant_quote() Live' button on the page.]

[Wait for the response — should appear in under 1 second.]

[Point to the response that appears:]

> "There it is. $4.20 per unit, 21-day lead time, $21,000 total, confidence 0.98.
> That response took 36 milliseconds.
>
> No email sent. No human involved. The factory pre-declared their pricing rules —
> our system computed this from their tiered pricing table.
>
> Compare that to your current workflow: 36 milliseconds versus 3 days."

[Let that sit for 2 seconds before moving on.]

---

## ACT 3 — TERMINAL (3 min)

[Switch to Tab 3 — Terminal]

Say:

> "Let me show you the raw API so you can see exactly what your agent would call."

[Type and run this command — go slowly, let them watch:]

```bash
curl "http://localhost:3000/capacity?category=pcb_assembly&qty=5000" | python3 -m json.tool
```

[Wait for output. Point to the results:]

> "Two factories with open capacity for PCB assembly right now.
> Zhongshan factory at $4.10/unit, Nanshan at $4.20.
> Your agent can compare these in the same API call."

[Now run the second command:]

```bash
curl "http://localhost:3000/factories/sz-006/instant-quote?category=pcb_assembly&qty=5000" | python3 -m json.tool
```

[Point to the output:]

> "Unit price, total, lead time, express option if they need it faster,
> available capacity — 35,000 units — and confidence score.
> This is everything your agent needs to make a sourcing decision.
> No back-and-forth. No waiting."

---

## ACT 4 — THE MCP TOOLS (2 min)

[Switch to Tab 2 — agent.html]

Say:

> "For your engineering team — the integration is one npm install.
> 'npx openfactory-mcp' — it's published on npm right now."

[Point to the tools list on the page:]

> "Eight tools total. The two new ones are the important ones —
> get_instant_quote and query_live_capacity.
> Those are the factory-side primitives that don't exist anywhere else.
>
> search_factories, place_order, track_order — those are the standard flow
> your agents already know how to use.
> They just slot in."

[If they ask about Claude Desktop, open Terminal and type:]
```bash
npx openfactory-mcp
```
> "That's it. One command. Your agent has access to 20 verified GBA factories."

---

## ACT 5 — THE ASK (2 min)

[Stop sharing screen. Look at camera.]

Say:

> "Here's where we are:
>
> We have 20 verified GBA factories across 8 cities —
> Shenzhen, Guangzhou, Dongguan, Foshan, and four more.
> The API is live. The MCP server is on npm. The escrow architecture is built.
>
> You have 100-plus Fortune 500 clients managing billions in spend,
> and your agents are still waiting 3 days for GBA factory responses.
>
> I want to build a Lio-specific integration.
> One API key from your side. I'll handle the factory supply layer.
> Your agents stop waiting."

[Pause.]

> "Can we get 30 minutes with your engineering team this week?"

[STOP TALKING. Do not add anything. Wait for their response.]

---

## HANDLING COMMON RESPONSES

**If they say "interesting, send me more info":**
> "Of course. I'll send the GitHub link and the npm package.
> But before I do — is the GBA last-mile latency actually a problem your agents hit?
> I want to make sure I'm solving the right thing for your team."
*(This turns a brush-off into a real conversation.)*

**If they say "how many real factories?":**
> "20 in the live system. Zero with signed commercial revenue agreements yet —
> that's the honest answer. The API works. The supply acquisition is the next step.
> That's actually why I want the integration conversation — demand from a partner
> like Lio is what converts the demo factories to committed suppliers."
*(Don't hedge. Honesty closes more deals than spin.)*

**If they say "we're already building something for this":**
> "That makes sense — it's an obvious gap. The question is build vs. buy.
> Building factory relationships in Shenzhen takes Mandarin, WeChat, and months
> of in-person visits. If you're doing that, great. If not, I already have the layer built."

**If they say "what's your pricing?":**
> "0.5 to 1 percent of GMV on orders placed through OpenFactory.
> For context: if we process 1% of your GBA sourcing volume,
> that's already a meaningful number. Happy to work through the math together."

**If they go quiet after your ask:**
> [Say nothing. Seriously. Count to 10 in your head. The first person to speak loses.]

---

## PRACTICE CHECKLIST

Run through this before the real call:

- [ ] Can you explain the problem in 30 seconds without notes?
- [ ] Can you click the live demo button and explain the output fluently?
- [ ] Can you run both curl commands without typos?
- [ ] Do you know the 4 key numbers: 36ms, 10ms, 20 factories, 8 cities?
- [ ] Have you said "Can we get 30 minutes with your engineering team this week?" out loud 3 times?
- [ ] Have you practiced staying silent after the ask?

---

## YOUR CHEAT SHEET (tape this next to your monitor)

```
PROBLEM:  Agent emails factory → waits 3 days → blocked
SOLUTION: get_instant_quote → 36ms binding price
          query_live_capacity → 10ms live availability

NUMBERS:
  36ms  — instant quote
  10ms  — capacity query
  20    — verified GBA factories
  8     — cities
  $260K — demo GMV
  $60M  — Lio + Didero raised (combined market validation)

ASK: "Can we get 30 min with your engineering team this week?"
THEN: SHUT UP.
```
