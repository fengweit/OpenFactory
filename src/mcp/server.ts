import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchFactories,
  getQuote,
  placeOrder,
  trackOrder,
  getAnalytics,
  updateOrderStatus,
  getInstantQuote,
  queryLiveCapacity,
} from "../db/factories.js";

const server = new McpServer({
  name: "openfactory",
  version: "0.2.0",
  description: "Turn verified Shenzhen factories into callable tools. Search, quote, order, and track manufacturing — all from your AI agent.",
});

function errorText(e: unknown): string {
  return `Error: ${e instanceof Error ? e.message : String(e)}`;
}

// ── search_factories ─────────────────────────────────────────────
server.tool(
  "search_factories",
  "Search 847 verified Shenzhen factories by category, MOQ, price tier, and rating. Returns ranked matches with capability data, certifications, and WeChat contact.",
  {
    category: z.string().optional().describe(
      "Product category: electronics_accessories | pcb_assembly | plastic_injection | metal_enclosure | cable_assembly"
    ),
    max_moq: z.number().optional().describe("Maximum acceptable minimum order quantity (units)"),
    price_tier: z.string().optional().describe("Price tier: budget | mid | premium"),
    min_rating: z.number().optional().describe("Minimum factory rating 0–5"),
    verified_only: z.boolean().optional().describe("Only return on-site verified factories (recommended: true)"),
  },
  async (params) => {
    try {
      const results = searchFactories(params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ factories: results, count: results.length }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── get_quote ────────────────────────────────────────────────────
server.tool(
  "get_quote",
  "Request a price quote from a specific factory. Returns unit price, total price, lead time, MOQ, and a 7-day valid quote_id for ordering.",
  {
    factory_id: z.string().describe("Factory ID from search_factories (e.g. sz-001)"),
    product_description: z.string().describe("Plain language description of what to manufacture"),
    quantity: z.number().int().positive().describe("Number of units to order"),
    buyer_id: z.string().optional().describe("Your buyer identifier (optional, stored with quote)"),
    target_price_usd: z.number().optional().describe("Target unit price in USD (optional, used for comparison)"),
    deadline_days: z.number().optional().describe("Days until you need delivery"),
  },
  async (params) => {
    try {
      const quote = getQuote(params);
      return { content: [{ type: "text", text: JSON.stringify(quote, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── place_order ──────────────────────────────────────────────────
server.tool(
  "place_order",
  "Place a manufacturing order from an accepted quote. Payment is held in escrow and only released after buyer confirms receipt. Returns order_id for tracking.",
  {
    quote_id: z.string().describe("quote_id from get_quote (valid for 7 days)"),
    buyer_id: z.string().describe("Your buyer identifier"),
  },
  async (params) => {
    try {
      const order = placeOrder(params);
      return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── track_order ──────────────────────────────────────────────────
server.tool(
  "track_order",
  "Check production status of a placed order. Returns current status, full event history (order_placed → confirmed → in_production → qc → shipped → delivered), and estimated ship date.",
  {
    order_id: z.string().describe("order_id from place_order"),
  },
  async ({ order_id }) => {
    try {
      const order = trackOrder(order_id);
      return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── update_order_status ───────────────────────────────────────────
server.tool(
  "update_order_status",
  "Update the production milestone of an order (factory-side). Valid statuses: confirmed | in_production | qc | shipped | delivered.",
  {
    order_id: z.string().describe("Order ID to update"),
    status: z.enum(["confirmed", "in_production", "qc", "shipped", "delivered"]).describe("New production status"),
    note: z.string().optional().describe("Optional note (e.g. tracking number, QC notes)"),
  },
  async (params) => {
    try {
      const order = updateOrderStatus(params.order_id, params.status, params.note);
      return { content: [{ type: "text", text: JSON.stringify(order, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── get_analytics ─────────────────────────────────────────────────
server.tool(
  "get_analytics",
  "Get platform analytics: factory count, quote volume, order count, GMV, and per-factory quote activity.",
  {},
  async () => {
    try {
      const analytics = getAnalytics();
      return { content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }] };
    } catch (e) {
      return { content: [{ type: "text", text: errorText(e) }], isError: true };
    }
  }
);

// ── get_instant_quote ────────────────────────────────────────────
server.tool(
  "get_instant_quote",
  "Get a sub-second binding quote from a factory's pre-declared pricing rules. No waiting — price computed instantly from tiered pricing + current capacity. Valid 48h. Use query_live_capacity first to find factories with available slots.",
  {
    factory_id: z.string().describe("Factory ID e.g. sz-006"),
    category:   z.string().describe("Category: pcb_assembly | electronics_accessories | cable_assembly | plastic_injection | metal_enclosure"),
    quantity:   z.number().describe("Number of units"),
  },
  async ({ factory_id, category, quantity }) => {
    try {
      const result = getInstantQuote(factory_id, category, quantity);
      if (!result) return { content: [{ type: "text", text: `No instant pricing available for ${factory_id} / ${category} / qty ${quantity}. Try get_quote for async RFQ.` }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return { content: [{ type: "text", text: errorText(e) }], isError: true }; }
  }
);

// ── query_live_capacity ──────────────────────────────────────────
server.tool(
  "query_live_capacity",
  "THE KILLER FEATURE: Query real-time available manufacturing capacity across all GBA factories. Returns only factories that can fulfill your order RIGHT NOW — with instant pricing, lead times, and confidence scores. Analogous to AWS spot instance availability. Results in <100ms.",
  {
    category:  z.string().describe("Product category: pcb_assembly | electronics_accessories | cable_assembly | plastic_injection | metal_enclosure"),
    quantity:  z.number().describe("Required units"),
    max_days:  z.number().optional().describe("Maximum acceptable lead time in days"),
  },
  async ({ category, quantity, max_days }) => {
    try {
      const results = queryLiveCapacity(category, quantity, max_days);
      if (!results.length) return { content: [{ type: "text", text: `No factories currently have capacity for ${quantity} units of ${category}${max_days ? ` within ${max_days} days` : ""}. Try relaxing constraints or use get_quote for async RFQ.` }] };
      const summary = {
        query: { category, quantity, max_days: max_days ?? null },
        factories_available: results.length,
        cheapest: results[0],
        fastest: [...results].sort((a, b) => a.lead_time_days - b.lead_time_days)[0],
        all_options: results,
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    } catch (e) { return { content: [{ type: "text", text: errorText(e) }], isError: true }; }
  }
);

// ── Start ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ OpenFactory MCP server v0.3.0 running (8 tools: search_factories, get_quote, get_instant_quote, query_live_capacity, place_order, track_order, update_order_status, get_analytics)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
