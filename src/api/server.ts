import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  searchFactories,
  getQuote,
  placeOrder,
  trackOrder,
  getAllFactories,
} from "../db/factories.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = Fastify({ logger: false });

// Serve static files (buyer UI + factory portal)
app.register(fastifyStatic, {
  root: join(__dirname, "../../public"),
  prefix: "/",
});

// CORS for local dev
app.addHook("onSend", async (req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
});

// Health check
app.get("/health", async () => ({
  service: "OpenFactory API",
  version: "0.1.0",
  tools: ["search_factories", "get_quote", "place_order", "track_order"],
}));

// GET /factories?category=electronics_accessories&max_moq=500&verified_only=true
app.get<{
  Querystring: {
    category?: string;
    max_moq?: string;
    price_tier?: string;
    min_rating?: string;
    verified_only?: string;
  };
}>("/factories", async (req) => {
  const { category, max_moq, price_tier, min_rating, verified_only } = req.query;
  const results = searchFactories({
    category,
    max_moq: max_moq ? Number(max_moq) : undefined,
    price_tier,
    min_rating: min_rating ? Number(min_rating) : undefined,
    verified_only: verified_only === "true",
  });
  return { factories: results, count: results.length };
});

// POST /quotes  { factory_id, product_description, quantity, target_price_usd?, deadline_days? }
app.post<{
  Body: {
    factory_id: string;
    product_description: string;
    quantity: number;
    target_price_usd?: number;
    deadline_days?: number;
  };
}>("/quotes", async (req) => {
  return getQuote(req.body);
});

// POST /orders  { quote_id, buyer_id }
app.post<{
  Body: { quote_id: string; buyer_id: string };
}>("/orders", async (req) => {
  return placeOrder(req.body);
});

// GET /orders/:id
app.get<{
  Params: { id: string };
}>("/orders/:id", async (req) => {
  return trackOrder(req.params.id);
});

// Start
const PORT = 3000;
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`\n🏭 OpenFactory REST API running on http://localhost:${PORT}\n`);
});
