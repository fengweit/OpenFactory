import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchFactories,
  getQuote,
  placeOrder,
  trackOrder,
} from "../db/factories.js";

const server = new McpServer({
  name: "openfactory",
  version: "0.1.0",
});

// ── search_factories ─────────────────────────────────────────────
server.tool(
  "search_factories",
  "Search verified Shenzhen factories by category, MOQ, price tier, and rating. Returns a ranked list of matching factories with capability data.",
  {
    category: z
      .string()
      .optional()
      .describe(
        "Product category: electronics_accessories | pcb_assembly | plastic_injection | metal_enclosure | cable_assembly"
      ),
    max_moq: z
      .number()
      .optional()
      .describe("Maximum acceptable minimum order quantity"),
    price_tier: z
      .string()
      .optional()
      .describe("Price tier: budget | mid | premium"),
    min_rating: z
      .number()
      .optional()
      .describe("Minimum factory rating (0–5)"),
    verified_only: z
      .boolean()
      .optional()
      .describe("Only return physically verified factories"),
  },
  async (params) => {
    const results = searchFactories(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ factories: results, count: results.length }, null, 2),
        },
      ],
    };
  }
);

// ── get_quote ────────────────────────────────────────────────────
server.tool(
  "get_quote",
  "Request a price quote from a specific factory for a product. Returns unit price, total price, lead time, and MOQ.",
  {
    factory_id: z
      .string()
      .describe("Factory ID from search_factories results"),
    product_description: z
      .string()
      .describe("Plain language description of what you need to manufacture"),
    quantity: z.number().describe("Number of units to order"),
    target_price_usd: z
      .number()
      .optional()
      .describe("Target unit price in USD (optional)"),
    deadline_days: z
      .number()
      .optional()
      .describe("Days until you need the product"),
  },
  async (params) => {
    const quote = getQuote(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(quote, null, 2),
        },
      ],
    };
  }
);

// ── place_order ──────────────────────────────────────────────────
server.tool(
  "place_order",
  "Place a manufacturing order based on an accepted quote. Payment is held in escrow and only released after buyer confirms receipt.",
  {
    quote_id: z.string().describe("Quote ID from get_quote"),
    buyer_id: z.string().describe("Your buyer identifier"),
  },
  async (params) => {
    const order = placeOrder(params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(order, null, 2),
        },
      ],
    };
  }
);

// ── track_order ──────────────────────────────────────────────────
server.tool(
  "track_order",
  "Check the current production status of a placed order. Returns status, milestones, and tracking number when shipped.",
  {
    order_id: z.string().describe("Order ID from place_order"),
  },
  async ({ order_id }) => {
    const order = trackOrder(order_id);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(order, null, 2),
        },
      ],
    };
  }
);

// ── Start ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ OpenFactory MCP server running (stdio)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
