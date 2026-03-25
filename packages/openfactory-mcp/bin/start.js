#!/usr/bin/env node
/**
 * openfactory-mcp v0.3.0 — factory-side API for AI procurement agents
 *
 * Connects to the OpenFactory REST API and exposes 8 manufacturing tools
 * to any MCP-compatible AI agent (Claude, GPT-4o, Lio, Didero, etc.)
 *
 * Usage:
 *   npx openfactory-mcp                           # connects to localhost:3000
 *   OPENFACTORY_URL=https://api.openfactory.com npx openfactory-mcp
 *
 * Claude Desktop config (~/.claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "openfactory": {
 *         "command": "npx",
 *         "args": ["openfactory-mcp"],
 *         "env": { "OPENFACTORY_URL": "http://localhost:3000" }
 *       }
 *     }
 *   }
 *
 * Tools:
 *   search_factories      — find verified GBA factories by category/MOQ/rating
 *   get_instant_quote  ⚡ — sub-100ms quote from pre-declared factory pricing
 *   query_live_capacity ⚡ — factories available to start production RIGHT NOW
 *   get_quote             — async RFQ (factory responds within 2h via WeChat)
 *   place_order           — place order with USD escrow protection
 *   track_order           — production milestone tracking
 *   update_order_status   — factory advances order status
 *   get_analytics         — platform GMV, response rates, top categories
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.OPENFACTORY_URL || "http://localhost:3000";

const server = new McpServer({
  name: "openfactory",
  version: "0.3.0",
  description: "Factory-side API for AI procurement agents. Call verified GBA factories — instant quotes in <100ms, live capacity, orders, escrow.",
});

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(e) {
  return { content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
}

// ── get_instant_quote ⚡ ──────────────────────────────────────────
server.tool("get_instant_quote",
  "⚡ Get a binding quote in <100ms from a factory's pre-declared pricing rules. No async wait. Returns unit price, total, lead time, and confidence score. Use this first — fall back to get_quote for complex or custom requirements.",
  {
    factory_id: z.string().describe("Factory ID (e.g. sz-006). Use search_factories or query_live_capacity to find IDs."),
    category: z.string().describe("Product category: pcb_assembly | electronics_accessories | cable_assembly | plastic_injection | metal_enclosure | furniture"),
    quantity: z.number().int().positive().describe("Number of units to manufacture"),
  },
  async ({ factory_id, category, quantity }) => {
    try {
      const qs = new URLSearchParams({ category, qty: String(quantity) });
      return ok(await api(`/factories/${factory_id}/instant-quote?${qs}`));
    } catch(e) { return err(e); }
  }
);

// ── query_live_capacity ⚡ ────────────────────────────────────────
server.tool("query_live_capacity",
  "⚡ Find factories that can START PRODUCTION RIGHT NOW for a given category and quantity. Returns live availability, unit price, and earliest start date. Analogous to AWS spot instances — real-time manufacturing capacity.",
  {
    category: z.string().describe("Product category: pcb_assembly | electronics_accessories | cable_assembly | plastic_injection | metal_enclosure | furniture"),
    quantity: z.number().int().positive().describe("Required production quantity"),
    city: z.string().optional().describe("Filter by city: shenzhen | guangzhou | dongguan | foshan | huizhou | zhongshan | jiangmen | zhuhai | zhuhai"),
  },
  async ({ category, quantity, city }) => {
    try {
      const qs = new URLSearchParams({ category, qty: String(quantity) });
      if (city) qs.set("city", city);
      return ok(await api(`/capacity?${qs}`));
    } catch(e) { return err(e); }
  }
);

// ── search_factories ─────────────────────────────────────────────
server.tool("search_factories",
  "Search verified GBA factories (Shenzhen · Guangzhou · Dongguan · Foshan) by category, MOQ, and price tier. Returns ranked matches with capabilities and WeChat contact.",
  {
    category: z.string().optional().describe("electronics_accessories | pcb_assembly | plastic_injection | metal_enclosure | cable_assembly | furniture"),
    max_moq: z.number().optional().describe("Maximum minimum order quantity"),
    price_tier: z.string().optional().describe("budget | mid | premium"),
    min_rating: z.number().optional().describe("Minimum rating 0–5"),
    verified_only: z.boolean().optional().describe("Only return physically verified factories (recommended)"),
  },
  async (params) => {
    try {
      const qs = new URLSearchParams();
      if (params.category)      qs.set("category", params.category);
      if (params.max_moq)       qs.set("max_moq", String(params.max_moq));
      if (params.price_tier)    qs.set("price_tier", params.price_tier);
      if (params.min_rating)    qs.set("min_rating", String(params.min_rating));
      if (params.verified_only !== undefined) qs.set("verified_only", String(params.verified_only));
      return ok(await api(`/factories?${qs}`));
    } catch(e) { return err(e); }
  }
);

// ── get_quote ────────────────────────────────────────────────────
server.tool("get_quote",
  "Request a price quote from a factory. Factory responds via WeChat within 2h. Returns a quote_id valid for 7 days. For instant pricing, use get_instant_quote instead.",
  {
    factory_id: z.string().describe("Factory ID from search_factories (e.g. sz-001)"),
    product_description: z.string().describe("Plain-language description of what to manufacture"),
    quantity: z.number().int().positive().describe("Number of units"),
    buyer_id: z.string().optional().describe("Your buyer ID"),
    target_price_usd: z.number().optional().describe("Target unit price in USD"),
    deadline_days: z.number().optional().describe("Days until delivery needed"),
  },
  async (params) => {
    try { return ok(await api("/quotes", { method: "POST", body: JSON.stringify(params) })); }
    catch(e) { return err(e); }
  }
);

// ── place_order ──────────────────────────────────────────────────
server.tool("place_order",
  "Place a manufacturing order from an accepted quote. Payment held in USD escrow until buyer confirms receipt.",
  {
    quote_id: z.string().describe("quote_id from get_quote or get_instant_quote"),
    buyer_id: z.string().describe("Your buyer ID"),
  },
  async (params) => {
    try { return ok(await api("/orders", { method: "POST", body: JSON.stringify(params) })); }
    catch(e) { return err(e); }
  }
);

// ── track_order ──────────────────────────────────────────────────
server.tool("track_order",
  "Get current production status and full event history for an order.",
  { order_id: z.string().describe("order_id from place_order") },
  async ({ order_id }) => {
    try { return ok(await api(`/orders/${order_id}`)); }
    catch(e) { return err(e); }
  }
);

// ── update_order_status ───────────────────────────────────────────
server.tool("update_order_status",
  "Update the production milestone of an order (factory-side). Status: confirmed | in_production | qc | shipped | delivered.",
  {
    order_id: z.string(),
    status: z.enum(["confirmed", "in_production", "qc", "shipped", "delivered"]),
    note: z.string().optional().describe("Optional note (e.g. tracking number)"),
  },
  async (params) => {
    try {
      return ok(await api(`/orders/${params.order_id}/status`, {
        method: "PATCH", body: JSON.stringify({ status: params.status, note: params.note })
      }));
    } catch(e) { return err(e); }
  }
);

// ── get_analytics ─────────────────────────────────────────────────
server.tool("get_analytics",
  "Get platform analytics: factory count, quote volume, GMV, response rates, top categories.",
  {},
  async () => {
    try { return ok(await api("/analytics")); }
    catch(e) { return err(e); }
  }
);

// ── start ─────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`✅ openfactory-mcp v0.3.0 connected to ${BASE_URL} (8 tools: search_factories, get_instant_quote ⚡, query_live_capacity ⚡, get_quote, place_order, track_order, update_order_status, get_analytics)`);
