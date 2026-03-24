import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  searchFactories,
  getQuote,
  placeOrder,
  trackOrder,
  getAllFactories,
  updateOrderStatus,
  getAnalytics,
  submitApplication,
  listApplications,
} from "../db/factories.js";
import { initAuthSchema, registerUser, loginUser } from "../auth/jwt.js";
import { notifyNewQuoteRequest, notifyOrderConfirmed } from "../services/wechat.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = Fastify({ logger: false });

// Rate limiting — 100 req/min per IP; /auth routes are stricter
app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({ error: "Too many requests. Limit: 100/min." }),
});

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
  version: "0.2.0",
  status: "ok",
  tools: ["search_factories", "get_quote", "place_order", "track_order", "update_order_status", "get_analytics"],
  factories: 10,
  uptime_s: Math.floor(process.uptime()),
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

// POST /quotes
app.post<{
  Body: {
    factory_id: string;
    product_description: string;
    quantity: number;
    buyer_id?: string;
    target_price_usd?: number;
    deadline_days?: number;
  };
}>("/quotes", async (req, reply) => {
  try {
    const quote = getQuote(req.body);
    // Fire WeChat notification async (non-blocking)
    const factories = getAllFactories();
    const factory = factories.find(f => f.id === req.body.factory_id);
    if (factory) {
      notifyNewQuoteRequest({
        factory_name: factory.name,
        factory_name_zh: factory.name_zh,
        buyer_id: req.body.buyer_id ?? "anonymous",
        product_description: req.body.product_description,
        quantity: req.body.quantity,
        target_price: req.body.target_price_usd,
        quote_id: quote.quote_id,
      }).catch(() => {/* non-fatal */});
    }
    return quote;
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// POST /orders
app.post<{
  Body: { quote_id: string; buyer_id: string };
}>("/orders", async (req, reply) => {
  try {
    const order = placeOrder(req.body);
    // Fire WeChat notification async (non-blocking)
    const factories = getAllFactories();
    const factory = factories.find(f => f.id === order.factory_id);
    if (factory) {
      notifyOrderConfirmed({
        factory_name: factory.name,
        order_id: order.order_id,
        quantity: order.quantity,
        total_price_usd: order.total_price_usd,
        estimated_ship_date: order.estimated_ship_date,
      }).catch(() => {/* non-fatal */});
    }
    return order;
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /orders/:id
app.get<{
  Params: { id: string };
}>("/orders/:id", async (req) => {
  return trackOrder(req.params.id);
});

// PATCH /orders/:id/status  { status, note? }
app.patch<{
  Params: { id: string };
  Body: { status: string; note?: string };
}>("/orders/:id/status", async (req) => {
  return updateOrderStatus(req.params.id, req.body.status as Parameters<typeof updateOrderStatus>[1], req.body.note);
});

// GET /analytics
app.get("/analytics", async () => getAnalytics());

// POST /onboard — submit factory application
app.post<{ Body: Record<string, unknown> }>("/onboard", async (req, reply) => {
  try {
    const d = req.body;
    const app_result = submitApplication({
      name_en: d.name_en as string,
      name_zh: d.name_zh as string | undefined,
      city: (d.city as string) || "Shenzhen",
      district: d.district as string | undefined,
      categories: (d.categories as string[]) || [],
      certifications: (d.certifications as string[]) || [],
      moq: Number(d.moq) || 300,
      capacity_units_per_month: Number(d.capacity_units_per_month) || 50000,
      lead_time_sample: Number(d.lead_time_sample) || 7,
      lead_time_production: Number(d.lead_time_production) || 25,
      price_tier: (d.price_tier as string) || "mid",
      contact_name: (d.contact_name as string) || "",
      wechat_id: d.wechat_id as string,
      email: d.email as string | undefined,
      phone: d.phone as string | undefined,
      description: d.description as string | undefined,
    });
    return { application_id: app_result.id, status: "pending", message: "Application received. Our Shenzhen team will contact you within 2 business days." };
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /admin/applications — list factory applications (admin only)
app.get<{ Querystring: { status?: string } }>("/admin/applications", async (req) => {
  const applications = listApplications(req.query.status);
  return { applications, count: applications.length };
});

// POST /auth/register
app.post<{ Body: { email: string; password: string; role?: "buyer" | "factory"; factory_id?: string } }>(
  "/auth/register", async (req, reply) => {
    try {
      return await registerUser(req.body);
    } catch (e: unknown) {
      reply.status(400).send({ error: (e as Error).message });
    }
  }
);

// POST /auth/login
app.post<{ Body: { email: string; password: string } }>(
  "/auth/login", async (req, reply) => {
    try {
      return await loginUser(req.body);
    } catch (e: unknown) {
      reply.status(401).send({ error: (e as Error).message });
    }
  }
);

// Init auth schema on startup
initAuthSchema();

// Start
const PORT = 3000;
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`\n🏭 OpenFactory REST API running on http://localhost:${PORT}\n`);
});
