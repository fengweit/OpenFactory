import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
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
  getQuotesByFactory,
  getOrdersByFactory,
  getInstantQuote,
  queryLiveCapacity,
  getFactoryCapacity,
  updateFactoryCapacity,
  getPricingRules,
  upsertPricingRules,
  createOrderMilestone,
  getOrderMilestones,
} from "../db/factories.js";
import { initAuthSchema, registerUser, loginUser, requireAuth } from "../auth/jwt.js";
import { getDb } from "../db/db.js";
import { notifyNewQuoteRequest, notifyOrderConfirmed } from "../services/wechat.js";
import { createEscrow, releaseEscrow, cancelEscrow, handleWebhookEvent } from "../services/stripe.js";
import { sendOrderConfirmation, sendShippingNotification } from "../services/email.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = Fastify({ logger: false });

// CORS — allow browser UIs and MCP clients from any origin in Phase 0
app.register(cors, { origin: true, credentials: true });

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
  reply.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
});

// Health check
app.get("/health", async () => {
  const db = getDb();
  const { total } = db.prepare("SELECT COUNT(*) as total FROM factories").get() as { total: number };
  const { verified } = db.prepare("SELECT COUNT(*) as verified FROM factories WHERE verified=1").get() as { verified: number };
  return {
    service: "OpenFactory API",
    version: "0.3.0",
    status: "ok",
    tools: ["search_factories", "get_quote", "place_order", "track_order", "update_order_status", "get_analytics", "get_instant_quote", "query_live_capacity"],
    total_factories: total,
    verified_factories: verified,
    uptime_s: Math.floor(process.uptime()),
  };
});

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
        factory_id: factory.id,
        factory_name: factory.name,
        factory_name_zh: factory.name_zh ?? factory.name,
        buyer_id: req.body.buyer_id ?? "anonymous",
        product_description: req.body.product_description,
        quantity: req.body.quantity,
        target_price: req.body.target_price_usd,
        quote_id: quote.quote_id,
        webhook_url: factory.wechat_webhook_url,
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
}>("/orders", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const order = placeOrder(req.body);
    // Fire WeChat + Stripe escrow async (non-blocking)
    const factories = getAllFactories();
    const factory = factories.find(f => f.id === order.factory_id);
    if (factory) {
      notifyOrderConfirmed({
        factory_name: factory.name,
        order_id: order.order_id,
        quantity: order.quantity,
        total_price_usd: order.total_price_usd,
        estimated_ship_date: order.estimated_ship_date,
        webhook_url: factory.wechat_webhook_url,
      }).catch(() => {/* non-fatal */});
    }
    // Send order confirmation email (non-blocking)
    const bid = req.body.buyer_id ?? "";
    const buyerEmail = bid.includes("@") ? bid : `${bid}@example.com`; // Phase 2: look up real email from users table
    const factories2 = getAllFactories();
    const factory2 = factories2.find(f => f.id === order.factory_id);
    sendOrderConfirmation({
      buyer_email: buyerEmail,
      order_id:    order.order_id,
      factory:     factory2?.name ?? order.factory_id,
      product:     "Your order",
      quantity:    order.quantity,
      total_usd:   order.total_price_usd,
      ship_date:   order.estimated_ship_date,
    }).catch(() => {/* non-fatal */});

    // Create Stripe escrow (non-blocking)
    createEscrow(order.total_price_usd, order.order_id)
      .then(e => console.log(`[Escrow] ${order.order_id} → ${e.payment_intent_id} (${e.status})`))
      .catch(() => {/* non-fatal in Phase 0 */});
    return order;
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /orders/:id
app.get<{
  Params: { id: string };
}>("/orders/:id", async (req) => {
  const order = trackOrder(req.params.id);
  const milestones = getOrderMilestones(req.params.id);
  return { ...order, milestones };
});

// PATCH /orders/:id/status  { status, note?, photo_urls? }
app.patch<{
  Params: { id: string };
  Body: { status: string; note?: string; photo_urls?: string[] };
}>("/orders/:id/status", async (req) => {
  const updated = updateOrderStatus(req.params.id, req.body.status as Parameters<typeof updateOrderStatus>[1], req.body.note, req.body.photo_urls);
  if (req.body.status === "shipped") {
    sendShippingNotification({
      buyer_email: `${updated.buyer_id}@example.com`,
      order_id: updated.order_id,
      tracking_number: req.body.note || "TBD",
      factory: updated.factory_id,
    }).catch(() => {});
  }
  return updated;
});

// POST /orders/:id/milestones — factory reports a production milestone
app.post<{
  Params: { id: string };
  Body: { milestone: string; photo_urls?: string[]; note?: string };
}>("/orders/:id/milestones", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { user_id: string; role: string };
  if (user.role !== "factory" && user.role !== "admin") {
    return reply.status(403).send({ error: "Only factory users can report milestones" });
  }
  try {
    const { milestone, photo_urls, note } = req.body;
    if (!milestone) return reply.status(400).send({ error: "milestone is required" });
    const created = createOrderMilestone(req.params.id, milestone, user.user_id, photo_urls, note);
    return reply.status(201).send(created);
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /orders/:id/milestones — all milestones for an order (authenticated)
app.get<{
  Params: { id: string };
}>("/orders/:id/milestones", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const milestones = getOrderMilestones(req.params.id);
    return { order_id: req.params.id, milestones, count: milestones.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// GET /analytics
app.get("/analytics", async () => getAnalytics());

// GET /factories/:id/quotes — quotes received by this factory
app.get<{ Params: { id: string } }>("/factories/:id/quotes", async (req, reply) => {
  try { return getQuotesByFactory(req.params.id); }
  catch (e: unknown) { reply.status(400).send({ error: (e as Error).message }); }
});

// GET /factories/:id/orders — orders placed with this factory
app.get<{ Params: { id: string } }>("/factories/:id/orders", async (req, reply) => {
  try { return getOrdersByFactory(req.params.id); }
  catch (e: unknown) { reply.status(400).send({ error: (e as Error).message }); }
});

// GET /factories/:id/capacity — current declared capacity for a factory
app.get<{ Params: { id: string } }>("/factories/:id/capacity", async (req, reply) => {
  try { return { factory_id: req.params.id, capacity: getFactoryCapacity(req.params.id) }; }
  catch (e: unknown) { reply.status(404).send({ error: (e as Error).message }); }
});

// PATCH /factories/:id/capacity — update declared capacity
app.patch<{
  Params: { id: string };
  Body: { category: string; available_units?: number; available_from?: string; price_override_usd?: number };
}>("/factories/:id/capacity", async (req, reply) => {
  try {
    const { category, available_units, available_from, price_override_usd } = req.body;
    if (!category) return reply.status(400).send({ error: "category is required" });
    const updated = updateFactoryCapacity(req.params.id, category, { available_units, available_from, price_override_usd });
    return updated;
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /factories/:id/pricing-rules — get all pricing rules for a factory
app.get<{ Params: { id: string } }>("/factories/:id/pricing-rules", async (req, reply) => {
  try { return { factory_id: req.params.id, rules: getPricingRules(req.params.id) }; }
  catch (e: unknown) { reply.status(404).send({ error: (e as Error).message }); }
});

// PATCH /factories/:id/pricing-rules — upsert pricing rules
app.patch<{
  Params: { id: string };
  Body: Array<{ category: string; min_qty?: number; max_qty?: number; unit_price_usd: number; lead_time_days?: number }>;
}>("/factories/:id/pricing-rules", async (req, reply) => {
  try {
    const rules = Array.isArray(req.body) ? req.body : [req.body];
    const updated = upsertPricingRules(req.params.id, rules);
    return { factory_id: req.params.id, rules: updated };
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// POST /webhooks/stripe — handle Stripe events
app.post<{ Body: Record<string, unknown> }>("/webhooks/stripe", async (req) => {
  const result = handleWebhookEvent(req.body as { type: string; data: { object: Record<string, unknown> } });
  return { received: true, result };
});

// POST /orders/:id/release-escrow — manually release escrow (buyer confirms receipt)
app.post<{ Params: { id: string } }>("/orders/:id/release-escrow", async (req, reply) => {
  try {
    // In Phase 2: look up payment_intent_id from DB; for now use mock
    const pi_id = `pi_dev_${req.params.id.replace("ord-","").slice(0,8)}`;
    const result = await releaseEscrow(pi_id);
    await updateOrderStatus(req.params.id, "delivered", "Escrow released — buyer confirmed receipt");
    return { ...result, order_id: req.params.id, message: "Escrow released. Funds will be paid to factory within 2 business days." };
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /factories/:id/instant-quote — sub-second binding quote from pricing rules
app.get<{ Params: { id: string }; Querystring: { category: string; qty: string } }>(
  "/factories/:id/instant-quote", (req, reply) => {
    const qty = parseInt(req.query.qty);
    if (!req.query.category || isNaN(qty) || qty <= 0)
      return reply.status(400).send({ error: "category and qty required" });
    const result = getInstantQuote(req.params.id, req.query.category, qty);
    if (!result) return reply.status(404).send({ error: "No pricing rules available for this factory/category/quantity" });
    return result;
  }
);

// GET /capacity — live capacity query across all factories
app.get<{ Querystring: { category: string; qty: string; max_days?: string } }>(
  "/capacity", (req, reply) => {
    const qty = parseInt(req.query.qty);
    if (!req.query.category || isNaN(qty) || qty <= 0)
      return reply.status(400).send({ error: "category and qty required" });
    const max_days = req.query.max_days ? parseInt(req.query.max_days) : undefined;
    const results = queryLiveCapacity(req.query.category, qty, max_days);
    return {
      query: { category: req.query.category, quantity: qty, max_days: max_days ?? null },
      count: results.length,
      results,
      computed_in_ms: 0, // SQLite is synchronous, effectively <1ms
    };
  }
);

// POST /quotes/:id/respond — factory responds to a quote request
app.post<{ Params: { id: string }; Body: { factory_id: string; unit_price_usd: number; lead_time_days: number; notes?: string } }>(
  "/quotes/:id/respond", async (req, reply) => {
    const db = getDb();
    const { factory_id, unit_price_usd, lead_time_days, notes } = req.body;
    const existing = db.prepare("SELECT * FROM quotes WHERE quote_id = ?").get(req.params.id) as Record<string,unknown> | undefined;
    if (!existing) return reply.status(404).send({ error: "Quote not found" });
    db.prepare("UPDATE quotes SET unit_price_usd = ?, total_price_usd = ?, lead_time_days = ? WHERE quote_id = ?")
      .run(unit_price_usd, unit_price_usd * Number(existing.quantity), lead_time_days, req.params.id);
    console.log(`[Quote] ${req.params.id} responded by ${factory_id}: $${unit_price_usd}/pc, ${lead_time_days}d${notes ? ` — ${notes}` : ''}`);
    return { quote_id: req.params.id, status: "responded", unit_price_usd, lead_time_days };
  }
);

// GET /factory/quick-reply — magic link from WeChat notification → factory-mobile.html
app.get<{ Querystring: { f?: string; a?: string; t?: string } }>("/factory/quick-reply", (req, reply) => {
  const { f = "", a = "quotes", t = "" } = req.query;
  const target = `/factory-mobile.html?f=${encodeURIComponent(f)}&a=${encodeURIComponent(a)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;
  reply.redirect(target);
});

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

// POST /test/notify — send a test WeChat notification (no auth required)
app.post<{ Querystring: { factory_id?: string } }>("/test/notify", async (req) => {
  const factory_id = req.query.factory_id || "sz-001";
  const factories = getAllFactories();
  const factory = factories.find(f => f.id === factory_id);
  const mockData = {
    factory_id,
    factory_name: factory?.name ?? "Test Factory",
    factory_name_zh: factory?.name_zh ?? "测试工厂",
    buyer_id: "test-buyer",
    product_description: "Test notification — 测试通知",
    quantity: 1000,
    target_price: 2.50,
    quote_id: `q-test-${Date.now().toString(36)}`,
    webhook_url: factory?.wechat_webhook_url,
  };
  try {
    await notifyNewQuoteRequest(mockData);
    const usedUrl = factory?.wechat_webhook_url || process.env.WECHAT_WEBHOOK_URL || "(dev mode — logged to console)";
    return {
      sent: true,
      webhook_url: usedUrl,
      payload: mockData,
    };
  } catch (e: unknown) {
    return { sent: false, error: (e as Error).message };
  }
});

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
