# OpenFactory — Claude Code Config

## Project overview
OpenFactory is an MCP server + REST API that turns verified Shenzhen factories into callable tools for AI agents. Think Stripe for manufacturing.

- **Stack:** TypeScript, Node.js, Fastify, Zod, `@modelcontextprotocol/sdk`
- **Run API:** `npm run api` → http://localhost:3000
- **Run MCP:** `npm run mcp`
- **4 tools:** `search_factories`, `get_quote`, `place_order`, `track_order`
- **Public pages:** `/` (landing), `/buyer.html`, `/portal.html`, `/agent.html`
- **Data:** `data/factories.json` (5 mock Shenzhen factories, sz-001–sz-005)

## Key files
- `src/api/server.ts` — Fastify REST API (GET /factories, POST /quotes, POST /orders, GET /orders/:id, GET /health)
- `src/mcp/server.ts` — MCP server (StdioServerTransport)
- `src/db/factories.ts` — in-memory DB layer (Map stores for quotes/orders)
- `src/schemas/` — Zod schemas (factory, quote, order)
- `public/` — 4 HTML pages (index, buyer, portal, agent)

## Code conventions
- TypeScript strict mode
- Zod for runtime validation
- No external DB yet — all in-memory Maps (POC)
- ES modules (`"type": "module"` in package.json)
- Import paths use `.js` extension (required for Node ESM)

## gstack
Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`,
`/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`,
`/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`,
`/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`,
`/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`,
`/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

If gstack skills aren't working, run: `cd .claude/skills/gstack && ./setup`

## Recommended skill order for this project
1. `/review` — code quality + bugs before demo
2. `/cso` — security audit (OWASP + STRIDE) before Qianhai pitch
3. `/qa http://localhost:3000` — browser test all 4 UI pages
4. `/plan-ceo-review` — scope challenge for Phase 1 roadmap
5. `/ship` — create PR when ready
