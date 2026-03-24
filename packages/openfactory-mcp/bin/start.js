#!/usr/bin/env node
/**
 * openfactory-mcp — standalone MCP server
 *
 * Connects to the OpenFactory REST API and exposes manufacturing tools
 * to any MCP-compatible AI agent (Claude, GPT-4o, etc.)
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
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.OPENFACTORY_URL || "http://localhost:3000";

const server = new McpServer({
  name: "openfactory",
  version: "0.2.0",
  description: "Turn verified GBA factories into callable tools. Search, quote, order, and track manufacturing — all from your AI agent.",
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
      const data = await api(`/factories?${qs}`);
      return ok(data);
    } catch(e) { return err(e); }
  }
);

// ── get_quote ────────────────────────────────────────────────────
server.tool("get_quote",
  "Request a price quote from a factory. Returns unit price, total, lead time, and a quote_id valid for 7 days.",
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
  "Place a manufacturing order from an accepted quote. Payment held in escrow until buyer confirms receipt.",
  {
    quote_id: z.string().describe("quote_id from get_quote"),
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
  "Get platform analytics: factory count, quote volume, GMV, and factory-level activity.",
  {},
  async () => {
    try { return ok(await api("/analytics")); }
    catch(e) { return err(e); }
  }
);

// ── start ─────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`✅ openfactory-mcp v0.2.0 connected to ${BASE_URL} (6 tools)`);
