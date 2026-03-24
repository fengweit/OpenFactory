# OpenFactory — Development Guide
> POC target: `search_factories` + `get_quote` + `place_order` working end-to-end against mock factory data

---

## What You're Building Today

A local MCP server that exposes factory capabilities as callable tools. By end of day you should have:

1. An MCP server runnable in Claude Desktop / Claude Code
2. Three working tools: `search_factories`, `get_quote`, `place_order`
3. A mock factory database (JSON) representing 3–5 electronics factories
4. A simple REST API wrapper around the same tools (for non-MCP buyers)

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| MCP server | `@modelcontextprotocol/sdk` (TypeScript) | Official SDK, best docs |
| REST API | `fastify` | Fast, lightweight, schema-first |
| Mock DB | JSON flat files | No infra needed for POC |
| Runtime | Node.js 20+ | Same as Claude Code |
| Language | TypeScript | Type safety on schemas matters here |

---

## Project Structure

```
openfactory/
├── src/
│   ├── mcp/
│   │   ├── server.ts          # MCP server entrypoint
│   │   └── tools/
│   │       ├── search.ts      # search_factories tool
│   │       ├── quote.ts       # get_quote tool
│   │       └── order.ts       # place_order tool
│   ├── api/
│   │   └── server.ts          # Fastify REST API (same logic)
│   ├── db/
│   │   └── factories.ts       # Mock factory data + query logic
│   └── schemas/
│       ├── factory.ts         # Factory capability schema
│       ├── quote.ts           # Quote request/response schema
│       └── order.ts           # Order schema
├── data/
│   └── factories.json         # Seed data: 5 mock factories
├── claude_desktop_config.json # Drop this into Claude Desktop
├── package.json
└── tsconfig.json
```

---

## Setup

```bash
mkdir openfactory && cd openfactory
npm init -y
npm install @modelcontextprotocol/sdk fastify zod typescript tsx
npm install -D @types/node
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

`package.json` scripts:
```json
{
  "scripts": {
    "mcp": "tsx src/mcp/server.ts",
    "api": "tsx src/api/server.ts",
    "dev": "tsx --watch src/api/server.ts"
  }
}
```

---

## Step 1 — Factory Capability Schema

This is the most important design decision. Start narrow: electronics accessories only.

`src/schemas/factory.ts`:
```typescript
import { z } from "zod";

export const FactoryCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  name_zh: z.string(),
  location: z.object({
    city: z.string(),       // "Shenzhen"
    district: z.string(),   // "Longhua", "Bao'an", etc.
  }),
  categories: z.array(z.enum([
    "electronics_accessories",
    "pcb_assembly",
    "plastic_injection",
    "metal_enclosure",
    "cable_assembly",
  ])),
  moq: z.number(),                    // minimum order quantity
  lead_time_days: z.object({
    sample: z.number(),
    production: z.number(),
  }),
  certifications: z.array(z.string()), // ["ISO9001", "CE", "RoHS"]
  price_tier: z.enum(["budget", "mid", "premium"]),
  capacity_units_per_month: z.number(),
  accepts_foreign_buyers: z.boolean(),
  wechat_id: z.string().optional(),
  verified: z.boolean(),
  rating: z.number().min(0).max(5).optional(),
});

export type Factory = z.infer<typeof FactoryCapabilitySchema>;
```

`src/schemas/quote.ts`:
```typescript
import { z } from "zod";

export const QuoteRequestSchema = z.object({
  factory_id: z.string(),
  product_description: z.string(),
  quantity: z.number(),
  target_price_usd: z.number().optional(),
  deadline_days: z.number().optional(),
  specs: z.record(z.string()).optional(), // flexible k/v for now
});

export const QuoteResponseSchema = z.object({
  quote_id: z.string(),
  factory_id: z.string(),
  unit_price_usd: z.number(),
  total_price_usd: z.number(),
  lead_time_days: z.number(),
  moq: z.number(),
  valid_until: z.string(), // ISO date
  notes: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
```

`src/schemas/order.ts`:
```typescript
import { z } from "zod";

export const OrderSchema = z.object({
  order_id: z.string(),
  quote_id: z.string(),
  factory_id: z.string(),
  buyer_id: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "in_production",
    "qc",
    "shipped",
    "delivered",
    "disputed",
  ]),
  quantity: z.number(),
  unit_price_usd: z.number(),
  total_price_usd: z.number(),
  escrow_held: z.boolean(),
  created_at: z.string(),
  estimated_ship_date: z.string(),
  tracking: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
```

---

## Step 2 — Mock Factory Data

`data/factories.json`:
```json
[
  {
    "id": "sz-001",
    "name": "Longhua Electronics Co.",
    "name_zh": "龙华电子有限公司",
    "location": { "city": "Shenzhen", "district": "Longhua" },
    "categories": ["electronics_accessories", "cable_assembly"],
    "moq": 500,
    "lead_time_days": { "sample": 7, "production": 25 },
    "certifications": ["ISO9001", "CE", "RoHS"],
    "price_tier": "mid",
    "capacity_units_per_month": 50000,
    "accepts_foreign_buyers": true,
    "verified": true,
    "rating": 4.3
  },
  {
    "id": "sz-002",
    "name": "Bao'an Precision Plastics",
    "name_zh": "宝安精密塑料厂",
    "location": { "city": "Shenzhen", "district": "Bao'an" },
    "categories": ["plastic_injection", "electronics_accessories"],
    "moq": 1000,
    "lead_time_days": { "sample": 14, "production": 35 },
    "certifications": ["ISO9001"],
    "price_tier": "budget",
    "capacity_units_per_month": 100000,
    "accepts_foreign_buyers": true,
    "verified": true,
    "rating": 4.0
  },
  {
    "id": "sz-003",
    "name": "GBA Metal Works",
    "name_zh": "大湾区金属制造",
    "location": { "city": "Shenzhen", "district": "Nanshan" },
    "categories": ["metal_enclosure", "electronics_accessories"],
    "moq": 200,
    "lead_time_days": { "sample": 10, "production": 30 },
    "certifications": ["ISO9001", "CE", "RoHS", "FCC"],
    "price_tier": "premium",
    "capacity_units_per_month": 20000,
    "accepts_foreign_buyers": true,
    "verified": true,
    "rating": 4.7
  },
  {
    "id": "sz-004",
    "name": "Futian PCB Assembly",
    "name_zh": "福田PCB组装厂",
    "location": { "city": "Shenzhen", "district": "Futian" },
    "categories": ["pcb_assembly", "electronics_accessories"],
    "moq": 100,
    "lead_time_days": { "sample": 5, "production": 20 },
    "certifications": ["ISO9001", "IPC-A-610"],
    "price_tier": "mid",
    "capacity_units_per_month": 30000,
    "accepts_foreign_buyers": true,
    "verified": false,
    "rating": 3.9
  },
  {
    "id": "sz-005",
    "name": "Qianhai Global Accessories",
    "name_zh": "前海全球配件有限公司",
    "location": { "city": "Shenzhen", "district": "Qianhai" },
    "categories": ["electronics_accessories", "cable_assembly", "plastic_injection"],
    "moq": 300,
    "lead_time_days": { "sample": 7, "production": 28 },
    "certifications": ["ISO9001", "CE", "RoHS", "REACH"],
    "price_tier": "mid",
    "capacity_units_per_month": 75000,
    "accepts_foreign_buyers": true,
    "verified": true,
    "rating": 4.5
  }
]
```

---

## Step 3 — DB Query Layer

`src/db/factories.ts`:
```typescript
import factories from "../../data/factories.json";
import { Factory } from "../schemas/factory";
import { QuoteRequest, QuoteResponse } from "../schemas/quote";
import { Order } from "../schemas/order";
import { randomUUID } from "crypto";

// In-memory order store for POC
const orders = new Map<string, Order>();
const quotes = new Map<string, QuoteResponse>();

export function searchFactories(params: {
  category?: string;
  max_moq?: number;
  price_tier?: string;
  min_rating?: number;
  verified_only?: boolean;
}): Factory[] {
  return (factories as Factory[]).filter((f) => {
    if (params.category && !f.categories.includes(params.category as any)) return false;
    if (params.max_moq && f.moq > params.max_moq) return false;
    if (params.price_tier && f.price_tier !== params.price_tier) return false;
    if (params.min_rating && (f.rating ?? 0) < params.min_rating) return false;
    if (params.verified_only && !f.verified) return false;
    return true;
  });
}

export function getQuote(req: QuoteRequest): QuoteResponse {
  const factory = (factories as Factory[]).find((f) => f.id === req.factory_id);
  if (!factory) throw new Error(`Factory ${req.factory_id} not found`);

  // Mock pricing logic — replace with real factory API calls later
  const basePriceByTier: Record<string, number> = {
    budget: 1.2,
    mid: 2.8,
    premium: 6.5,
  };
  const unitPrice = basePriceByTier[factory.price_tier] ?? 2.0;
  const volumeDiscount = req.quantity >= 1000 ? 0.85 : req.quantity >= 500 ? 0.92 : 1.0;
  const finalUnitPrice = parseFloat((unitPrice * volumeDiscount).toFixed(2));

  const quote: QuoteResponse = {
    quote_id: `q-${randomUUID().slice(0, 8)}`,
    factory_id: req.factory_id,
    unit_price_usd: finalUnitPrice,
    total_price_usd: parseFloat((finalUnitPrice * req.quantity).toFixed(2)),
    lead_time_days: factory.lead_time_days.production,
    moq: factory.moq,
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: `Quote for ${req.quantity} units of ${req.product_description}`,
  };

  quotes.set(quote.quote_id, quote);
  return quote;
}

export function placeOrder(params: {
  quote_id: string;
  buyer_id: string;
}): Order {
  const quote = quotes.get(params.quote_id);
  if (!quote) throw new Error(`Quote ${params.quote_id} not found or expired`);

  const order: Order = {
    order_id: `ord-${randomUUID().slice(0, 8)}`,
    quote_id: params.quote_id,
    factory_id: quote.factory_id,
    buyer_id: params.buyer_id,
    status: "pending",
    quantity: Math.round(quote.total_price_usd / quote.unit_price_usd),
    unit_price_usd: quote.unit_price_usd,
    total_price_usd: quote.total_price_usd,
    escrow_held: true,
    created_at: new Date().toISOString(),
    estimated_ship_date: new Date(
      Date.now() + quote.lead_time_days * 24 * 60 * 60 * 1000
    ).toISOString(),
  };

  orders.set(order.order_id, order);
  return order;
}

export function trackOrder(order_id: string): Order {
  const order = orders.get(order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);
  return order;
}
```

---

## Step 4 — MCP Server

`src/mcp/server.ts`:
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchFactories, getQuote, placeOrder, trackOrder } from "../db/factories";

const server = new McpServer({
  name: "openfactory",
  version: "0.1.0",
});

// ── Tool: search_factories ───────────────────────────────────────
server.tool(
  "search_factories",
  "Search verified Shenzhen factories by category, MOQ, price tier, and rating",
  {
    category: z.string().optional().describe(
      "Product category: electronics_accessories | pcb_assembly | plastic_injection | metal_enclosure | cable_assembly"
    ),
    max_moq: z.number().optional().describe("Maximum acceptable minimum order quantity"),
    price_tier: z.string().optional().describe("budget | mid | premium"),
    min_rating: z.number().optional().describe("Minimum factory rating (0-5)"),
    verified_only: z.boolean().optional().describe("Only return physically verified factories"),
  },
  async (params) => {
    const results = searchFactories(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ factories: results, count: results.length }, null, 2),
      }],
    };
  }
);

// ── Tool: get_quote ──────────────────────────────────────────────
server.tool(
  "get_quote",
  "Request a price quote from a specific factory for a product",
  {
    factory_id: z.string().describe("Factory ID from search_factories results"),
    product_description: z.string().describe("Plain language description of what you need"),
    quantity: z.number().describe("Number of units"),
    target_price_usd: z.number().optional().describe("Target unit price in USD"),
    deadline_days: z.number().optional().describe("Days until you need the product"),
  },
  async (params) => {
    const quote = getQuote(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(quote, null, 2),
      }],
    };
  }
);

// ── Tool: place_order ────────────────────────────────────────────
server.tool(
  "place_order",
  "Place a manufacturing order based on an accepted quote. Payment held in escrow.",
  {
    quote_id: z.string().describe("Quote ID from get_quote"),
    buyer_id: z.string().describe("Your buyer identifier"),
  },
  async (params) => {
    const order = placeOrder(params);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(order, null, 2),
      }],
    };
  }
);

// ── Tool: track_order ────────────────────────────────────────────
server.tool(
  "track_order",
  "Check the current status of a placed order",
  {
    order_id: z.string().describe("Order ID from place_order"),
  },
  async ({ order_id }) => {
    const order = trackOrder(order_id);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(order, null, 2),
      }],
    };
  }
);

// ── Start ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenFactory MCP server running");
}

main().catch(console.error);
```

---

## Step 5 — REST API (same logic, HTTP interface)

`src/api/server.ts`:
```typescript
import Fastify from "fastify";
import { searchFactories, getQuote, placeOrder, trackOrder } from "../db/factories";

const app = Fastify({ logger: true });

app.get("/factories", async (req: any) => {
  return searchFactories(req.query);
});

app.post("/quotes", async (req: any) => {
  return getQuote(req.body);
});

app.post("/orders", async (req: any) => {
  return placeOrder(req.body);
});

app.get("/orders/:id", async (req: any) => {
  return trackOrder(req.params.id);
});

app.listen({ port: 3000 }, () => {
  console.log("OpenFactory REST API running on http://localhost:3000");
});
```

---

## Step 6 — Wire into Claude Desktop

`claude_desktop_config.json` (merge into your `~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "openfactory": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/openfactory/src/mcp/server.ts"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop. You should see `openfactory` in the tools list. Then test:

> "Search for verified electronics accessory factories in Shenzhen with MOQ under 500"

> "Get a quote from sz-005 for 800 custom phone cases"

> "Place an order using that quote, buyer ID is rist-001"

---

## POC Test Script

Run this against the REST API to verify the full flow without Claude:

```bash
# 1. Search factories
curl "http://localhost:3000/factories?category=electronics_accessories&verified_only=true&max_moq=500"

# 2. Get quote
curl -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-005","product_description":"custom branded phone cases","quantity":800}'

# 3. Place order (use quote_id from step 2)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"quote_id":"<from_step_2>","buyer_id":"rist-001"}'

# 4. Track order (use order_id from step 3)
curl http://localhost:3000/orders/<from_step_3>
```

---

## What's Intentionally Fake in the POC

Be clear on what you're mocking vs. what's real — this matters for the pitch.

| Thing | POC Status | Real version needs |
|---|---|---|
| Factory data | Hardcoded JSON | Physical visits + onboarding form |
| Pricing | Formula-based estimate | Real RFQ from factory WeChat/portal |
| Quotes | Generated server-side | Async: factory responds within 24h |
| Escrow | Flag only (`escrow_held: true`) | Stripe + CN acquiring bank |
| Order status | Static `"pending"` | Webhook from factory portal |
| IP/NDA | Not implemented | DocuSign or CN equivalent |

---

## Next POC Milestones (after today)

1. **Async quote flow** — factory gets notified (email/WeChat), responds with real pricing, buyer polls for result
2. **Spec attachment** — buyer uploads PDF/image with the order, stored in S3
3. **Multi-quote comparison** — call `get_quote` against 3 factories in parallel, return ranked comparison
4. **Claude Code integration** — wire the MCP server into Claude Code so you can demo sourcing from inside a coding session
5. **Factory portal stub** — a simple Next.js page where a factory can log in, see incoming quote requests, and respond

---

## Useful References

- MCP SDK docs: https://modelcontextprotocol.io/docs
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Claude Desktop MCP setup: https://docs.anthropic.com/en/docs/claude-code/mcp
- Zod schema validation: https://zod.dev
- Fastify docs: https://fastify.dev
