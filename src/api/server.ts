import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import { join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync, existsSync } from "fs";
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
  approveApplication,
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
  getFactoryById,
  getFactoryIdentity,
  verifyUscc,
  setFactoryVerified,
  createQcRequest,
  getQcRequestsByOrder,
  submitQcResult,
  transitionEscrow,
  getEscrowEvents,
  validateEscrowRelease,
  raiseDispute,
  getDisputesByOrder,
  resolveDispute,
  getFactoryPerformance,
  computeDeliveryStats,
  computeTrustScore,
  getOrderHealth,
  createRfq,
  getRfqById,
  releaseEscrowByMilestone,
  EscrowReleaseError,
  createReview,
  getReviewsByFactory,
  getReviewSummary,
  validateUSCC,
  getDeliveryScore,
  checkStaleOrders,
  markStaleAlertSent,
} from "../db/factories.js";
import { initAuthSchema, registerUser, loginUser, requireAuth, requireAuthOrApiKey, generateApiKey } from "../auth/jwt.js";
import { getDb } from "../db/db.js";
import { notifyNewQuoteRequest, notifyOrderConfirmed, notifyBuyerMilestone } from "../services/wechat.js";
import { createEscrow, releaseEscrow, cancelEscrow, handleWebhookEvent, verifyWebhookSignature } from "../services/stripe.js";
import { sendOrderConfirmation, sendShippingNotification, notifyBuyerMilestoneUpdate, notifyBuyerStaleOrder } from "../services/email.js";
import { openapiSpec } from "./openapi.js";

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

// Multipart file uploads (max 5MB per file)
app.register(fastifyMultipart, {
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

// Serve static files (buyer UI + factory portal)
app.register(fastifyStatic, {
  root: join(__dirname, "../../public"),
  prefix: "/",
});

// Serve uploaded files from data/uploads/
const uploadsRoot = join(__dirname, "../../data/uploads");
if (!existsSync(uploadsRoot)) mkdirSync(uploadsRoot, { recursive: true });
app.register(fastifyStatic, {
  root: uploadsRoot,
  prefix: "/uploads/",
  decorateReply: false,
});

// CORS for local dev
app.addHook("onSend", async (req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
});

// OpenAPI spec
app.get("/openapi.json", async () => openapiSpec);

// Health check
app.get("/health", async () => {
  const db = getDb();
  const { total } = db.prepare("SELECT COUNT(*) as total FROM factories").get() as { total: number };
  const { verified } = db.prepare("SELECT COUNT(*) as verified FROM factories WHERE verified=1").get() as { verified: number };
  return {
    service: "OpenFactory API",
    version: "0.3.0",
    status: "ok",
    tools: ["search_factories", "get_quote", "place_order", "track_order", "update_order_status", "get_analytics", "get_instant_quote", "query_live_capacity", "verify_factory_identity", "report_milestone", "check_escrow_status", "lock_deposit", "raise_dispute", "confirm_receipt"],
    total_factories: total,
    verified_factories: verified,
    uptime_s: Math.floor(process.uptime()),
  };
});

// GET /factories/public — unauthenticated, curated subset (no contact info)
app.get<{
  Querystring: {
    category?: string;
    verified_only?: string;
    sort?: string;
    min_trust_score?: string;
  };
}>("/factories/public", async (req) => {
  const { category, verified_only, sort, min_trust_score } = req.query;
  const results = searchFactories({
    category,
    verified_only: verified_only === "true",
    sort,
    min_trust_score: min_trust_score ? Number(min_trust_score) : undefined,
  });
  const factories = results.map(f => ({
    id: f.id,
    name: f.name,
    name_zh: f.name_zh,
    location: f.location,
    categories: f.categories,
    certifications: f.certifications,
    verified: f.verified,
    trust_score: f.trust_score,
    price_tier: f.price_tier,
    moq: f.moq,
    lead_time_days: f.lead_time_days,
    capacity_units_per_month: f.capacity_units_per_month,
    rating: f.rating,
    has_uscc: Boolean(f.uscc),
    identity_complete: Boolean(f.uscc && f.legal_rep && f.business_license_expiry),
    business_license_valid: f.business_license_expiry
      ? new Date(f.business_license_expiry) > new Date()
      : false,
  }));
  return { factories, count: factories.length };
});

// GET /factories?category=electronics_accessories&max_moq=500&verified_only=true&sort=trust_score&min_trust_score=50
app.get<{
  Querystring: {
    category?: string;
    max_moq?: string;
    price_tier?: string;
    min_rating?: string;
    verified_only?: string;
    sort?: string;
    min_trust_score?: string;
  };
}>("/factories", { preHandler: [requireAuthOrApiKey] }, async (req) => {
  const { category, max_moq, price_tier, min_rating, verified_only, sort, min_trust_score } = req.query;
  const results = searchFactories({
    category,
    max_moq: max_moq ? Number(max_moq) : undefined,
    price_tier,
    min_rating: min_rating ? Number(min_rating) : undefined,
    verified_only: verified_only === "true",
    sort,
    min_trust_score: min_trust_score ? Number(min_trust_score) : undefined,
  });
  const factories = results.map(f => ({
    ...f,
    identity_complete: Boolean(f.uscc && f.legal_rep && f.business_license_expiry),
  }));
  return { factories, count: factories.length };
});

// GET /factories/:id — single factory with all fields including identity
app.get<{ Params: { id: string } }>("/factories/:id", async (req, reply) => {
  const factory = getFactoryById(req.params.id);
  if (!factory) return reply.status(404).send({ error: `Factory ${req.params.id} not found` });
  return factory;
});

// GET /factories/:id/verify-identity — identity trust data for buyer agents
app.get<{ Params: { id: string } }>("/factories/:id/verify-identity", async (req, reply) => {
  const identity = getFactoryIdentity(req.params.id);
  if (!identity) return reply.status(404).send({ error: `Factory ${req.params.id} not found` });
  return identity;
});

// POST /factories/:id/verify-uscc — validate and store USCC
app.post<{ Params: { id: string }; Body: { uscc: string } }>(
  "/factories/:id/verify-uscc", async (req, reply) => {
    try {
      const { uscc } = req.body;
      if (!uscc) return reply.status(400).send({ error: "uscc is required" });
      const result = verifyUscc(req.params.id, uscc);
      if (!result.uscc_valid) return reply.status(400).send(result);
      return result;
    } catch (e: unknown) {
      const msg = (e as Error).message;
      const status = msg.includes("not found") ? 404 : 400;
      reply.status(status).send({ error: msg });
    }
  }
);

// POST /quotes (quote request) — auth or API key
app.post<{
  Body: {
    factory_id: string;
    product_description: string;
    quantity: number;
    buyer_id?: string;
    target_price_usd?: number;
    deadline_days?: number;
  };
}>("/quotes", { preHandler: [requireAuthOrApiKey] }, async (req, reply) => {
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
}>("/orders", { preHandler: [requireAuthOrApiKey] }, async (req, reply) => {
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

// POST /orders/:id/escrow/lock — buyer explicitly locks 30% deposit
// Creates a real Stripe PaymentIntent with capture_method: 'manual' and stores payment_intent_id
app.post<{ Params: { id: string } }>("/orders/:id/escrow/lock", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const db = getDb();
    const order = db.prepare("SELECT order_id, escrow_status, total_price_usd, payment_intent_id FROM orders WHERE order_id = ?")
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!order) return reply.status(404).send({ error: `Order ${req.params.id} not found` });
    if (order.escrow_status !== "pending_deposit") {
      return reply.status(409).send({ error: `Cannot lock deposit: escrow is already in '${order.escrow_status}' state` });
    }

    const total = Number(order.total_price_usd);
    const deposit_amount = total * 0.30;

    // Create Stripe PaymentIntent for the FULL order amount (capture_method: manual)
    // We hold the full amount and release in milestone-gated partial captures (30/40/30)
    const escrowResult = await createEscrow(total, req.params.id);

    const event = transitionEscrow(req.params.id, "deposit_held", "manual", {
      amount_usd: deposit_amount,
      note: `30% deposit locked by buyer — $${deposit_amount.toFixed(2)} of $${total} (Stripe PI: ${escrowResult.payment_intent_id})`,
    });

    return reply.status(200).send({
      order_id: req.params.id,
      deposit_locked: true,
      deposit_amount_usd: deposit_amount,
      remaining_usd: total - deposit_amount,
      escrow_status: "deposit_held",
      escrow_event: event,
      payment_intent_id: escrowResult.payment_intent_id,
      escrow_provider: "stripe",
      dev_mode: escrowResult.dev_mode,
      message: "Deposit locked via Stripe. Factory can now begin production.",
    });
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// POST /orders/:id/escrow/release — milestone-based escrow release with Stripe partial capture
// Validates milestone + photo evidence, then captures the milestone's share (30/40/30) via Stripe
app.post<{
  Params: { id: string };
  Body: { milestone: "production_started" | "qc_pass" | "shipped"; verified_by?: string };
}>("/orders/:id/escrow/release", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const { milestone, verified_by } = req.body;
    if (!milestone) return reply.status(400).send({ error: "milestone is required" });

    // Milestone → capture percentage (30/40/30 structure)
    const MILESTONE_CAPTURE_PCT: Record<string, number> = {
      production_started: 0.30,
      qc_pass:            0.40,
      shipped:            0.30,
    };

    // Release escrow in the DB (validates milestone, photos, transitions state)
    const result = releaseEscrowByMilestone(req.params.id, milestone, verified_by);

    // Capture the milestone's share via Stripe
    const db = getDb();
    const order = db.prepare("SELECT payment_intent_id, total_price_usd FROM orders WHERE order_id = ?")
      .get(req.params.id) as { payment_intent_id: string | null; total_price_usd: number } | undefined;

    let stripe_capture = null;
    if (order?.payment_intent_id) {
      const capture_pct = MILESTONE_CAPTURE_PCT[milestone] ?? 0;
      const capture_amount = Number(order.total_price_usd) * capture_pct;
      stripe_capture = await releaseEscrow(order.payment_intent_id, capture_amount);
      stripe_capture = { ...stripe_capture, capture_pct, capture_amount_usd: capture_amount };
    }

    return reply.status(200).send({
      ...result,
      stripe_capture,
      escrow_provider: "stripe",
    });
  } catch (e: unknown) {
    if (e instanceof EscrowReleaseError) {
      return reply.status(409).send({
        error: e.message,
        escrow_status: e.escrow_status,
        milestone: e.milestone,
      });
    }
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /orders/:id
app.get<{
  Params: { id: string };
}>("/orders/:id", { preHandler: [requireAuthOrApiKey] }, async (req) => {
  const order = trackOrder(req.params.id);
  const milestones = getOrderMilestones(req.params.id);
  const escrow_events = getEscrowEvents(req.params.id);
  return { ...order, milestones, escrow_events };
});

// PATCH /orders/:id/status  { status, note?, photo_urls? }
// Allowed status transitions — enforces sequential progression
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending:       ["confirmed"],
  confirmed:     ["in_production"],
  in_production: ["qc"],
  qc:            ["shipped"],
  shipped:       ["delivered"],
};

app.patch<{
  Params: { id: string };
  Body: { status: string; note?: string; photo_urls?: string[] };
}>("/orders/:id/status", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { user_id: string; role: string; factory_id: string | null };
  const db = getDb();

  // Look up the order to check ownership and current status
  const order = db.prepare("SELECT order_id, factory_id, buyer_id, status FROM orders WHERE order_id = ?")
    .get(req.params.id) as { order_id: string; factory_id: string; buyer_id: string; status: string } | undefined;
  if (!order) return reply.status(404).send({ error: `Order ${req.params.id} not found` });

  // Role-based access: only the factory owner or an admin can update status
  if (user.role !== "admin" && !(user.role === "factory" && user.factory_id === order.factory_id)) {
    return reply.status(403).send({ error: "Only the factory owner or an admin can update order status" });
  }

  // Validate status transition
  const allowed = ALLOWED_STATUS_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(req.body.status)) {
    return reply.status(422).send({
      error: `Invalid status transition: '${order.status}' → '${req.body.status}'`,
      current_status: order.status,
      allowed_transitions: allowed || [],
    });
  }

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
    const result = createOrderMilestone(req.params.id, milestone, user.user_id, photo_urls, note);
    const response: Record<string, unknown> = { ...result.milestone };
    response.photo_upload_url = `/orders/${req.params.id}/milestones/${result.milestone.id}/photos`;
    if (result.escrow_transition) {
      response.escrow_transition = result.escrow_transition;
    }

    // Recompute trust score (non-blocking side-effect)
    const db = getDb();
    const order = db.prepare("SELECT buyer_id, factory_id, escrow_status FROM orders WHERE order_id = ?")
      .get(req.params.id) as { buyer_id: string; factory_id: string; escrow_status: string } | undefined;
    if (order) {
      try { computeTrustScore(order.factory_id); } catch { /* non-fatal */ }
    }

    // Notify buyer via email + WeChat (non-blocking)
    if (order) {
      const factory = getFactoryById(order.factory_id);
      const factoryName = factory?.name ?? order.factory_id;
      const photos = photo_urls ?? [];
      const ts = result.milestone.created_at ?? new Date().toISOString();

      // Resolve buyer email from users table
      const buyer = db.prepare("SELECT email, wechat_id FROM users WHERE id = ?")
        .get(order.buyer_id) as { email: string; wechat_id: string | null } | undefined;
      const buyerEmail = buyer?.email ?? (order.buyer_id.includes("@") ? order.buyer_id : null);

      if (buyerEmail) {
        notifyBuyerMilestoneUpdate({
          buyer_email:   buyerEmail,
          order_id:      req.params.id,
          milestone,
          timestamp:     ts,
          photo_urls:    photos,
          escrow_status: order.escrow_status,
          factory_name:  factoryName,
          note,
        }).catch(() => {/* non-fatal */});
      }

      // WeChat notification for buyers with wechat_id
      if (buyer?.wechat_id) {
        notifyBuyerMilestone({
          order_id:      req.params.id,
          milestone,
          timestamp:     ts,
          photo_urls:    photos,
          escrow_status: order.escrow_status,
          factory_name:  factoryName,
          note,
          wechat_id:     buyer.wechat_id,
        }).catch(() => {/* non-fatal */});
      }
    }

    return reply.status(201).send(response);
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

    // Enrich each milestone with uploaded photos from milestone_photos table
    const db = getDb();
    const photoStmt = db.prepare(
      "SELECT id, file_path, original_filename, uploaded_at, file_size_bytes FROM milestone_photos WHERE milestone_id = ? AND order_id = ? ORDER BY uploaded_at ASC"
    );
    const enriched = milestones.map(m => ({
      ...m,
      uploaded_photos: (photoStmt.all(m.id, req.params.id) as Array<Record<string, unknown>>).map(p => ({
        id: p.id,
        url: p.file_path,
        original_filename: p.original_filename,
        uploaded_at: p.uploaded_at,
        file_size_bytes: p.file_size_bytes,
      })),
    }));

    return { order_id: req.params.id, milestones: enriched, count: enriched.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// POST /orders/:id/milestones/:milestoneId/photos — upload milestone proof photos
app.post<{
  Params: { id: string; milestoneId: string };
}>("/orders/:id/milestones/:milestoneId/photos", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { user_id: string; role: string };
  if (user.role !== "factory" && user.role !== "admin") {
    return reply.status(403).send({ error: "Only factory users can upload milestone photos" });
  }
  try {
    const db = getDb();
    const orderId = req.params.id;
    const milestoneId = req.params.milestoneId;

    // Verify the milestone exists and belongs to this order
    const milestone = db.prepare(
      "SELECT id, order_id FROM order_milestones WHERE id = ? AND order_id = ?"
    ).get(Number(milestoneId), orderId) as Record<string, unknown> | undefined;
    if (!milestone) {
      return reply.status(404).send({ error: `Milestone ${milestoneId} not found for order ${orderId}` });
    }

    // Look up factory_id from the order
    const order = db.prepare("SELECT factory_id FROM orders WHERE order_id = ?")
      .get(orderId) as { factory_id: string } | undefined;
    if (!order) {
      return reply.status(404).send({ error: `Order ${orderId} not found` });
    }

    const dir = join(__dirname, `../../data/uploads/milestones/${orderId}/${milestoneId}`);
    mkdirSync(dir, { recursive: true });

    const parts = req.files();
    const saved: Array<{ url: string; original_filename: string; file_size_bytes: number }> = [];

    const insertPhoto = db.prepare(`
      INSERT INTO milestone_photos (milestone_id, order_id, factory_id, file_path, original_filename, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for await (const part of parts) {
      if (!part.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
        return reply.status(400).send({ error: `Invalid file type '${part.mimetype}'. Only JPEG, PNG, and WebP allowed.` });
      }
      const buf = await part.toBuffer();
      const ext = part.mimetype === "image/png" ? "png" : part.mimetype === "image/webp" ? "webp" : "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `/uploads/milestones/${orderId}/${milestoneId}/${filename}`;

      writeFileSync(join(dir, filename), buf);
      insertPhoto.run(Number(milestoneId), orderId, order.factory_id, filePath, part.filename || filename, buf.length);
      saved.push({ url: filePath, original_filename: part.filename || filename, file_size_bytes: buf.length });

      if (saved.length >= 5) break;
    }

    if (saved.length === 0) {
      return reply.status(400).send({ error: "No image files provided" });
    }
    return reply.status(201).send({
      milestone_id: Number(milestoneId),
      order_id: orderId,
      photos: saved,
      count: saved.length,
    });
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /orders/:id/health — real-time order health for AI agent monitoring
app.get<{
  Params: { id: string };
}>("/orders/:id/health", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const health = getOrderHealth(req.params.id);
    return health;
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// GET /orders/stale — find orders with no production updates (buyer or admin)
app.get<{
  Querystring: { threshold_days?: string };
}>("/orders/stale", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { user_id: string; role: string };
  if (user.role !== "buyer" && user.role !== "admin") {
    return reply.status(403).send({ error: "Only buyers or admins can view stale orders" });
  }

  const threshold = req.query.threshold_days ? Number(req.query.threshold_days) : 5;
  if (isNaN(threshold) || threshold < 1) {
    return reply.status(400).send({ error: "threshold_days must be a positive integer" });
  }

  let staleOrders = checkStaleOrders(threshold);

  // Buyers only see their own stale orders
  if (user.role === "buyer") {
    staleOrders = staleOrders.filter(o => o.buyer_id === user.user_id);
  }

  // For each newly-detected stale order, send buyer notification (once)
  const db = getDb();
  for (const order of staleOrders) {
    const sent = markStaleAlertSent(order.order_id);
    if (sent) {
      // Resolve buyer email
      const buyer = db.prepare("SELECT email, wechat_id FROM users WHERE id = ?")
        .get(order.buyer_id) as { email: string; wechat_id: string | null } | undefined;
      const buyerEmail = buyer?.email ?? (order.buyer_id.includes("@") ? order.buyer_id : null);
      const factory = getFactoryById(order.factory_id);
      const factoryName = factory?.name ?? order.factory_id;

      if (buyerEmail) {
        notifyBuyerStaleOrder({
          buyer_email: buyerEmail,
          order_id: order.order_id,
          factory_name: factoryName,
          days_since_last_update: order.days_since_last_update,
          expected_milestone: order.expected_milestone,
          status: order.status,
        }).catch(() => {/* non-fatal */});
      }

      // WeChat notification for buyers with wechat_id
      if (buyer?.wechat_id) {
        notifyBuyerMilestone({
          order_id: order.order_id,
          milestone: `stale_alert (${order.days_since_last_update} days silent)`,
          timestamp: new Date().toISOString(),
          photo_urls: [],
          escrow_status: "unknown",
          factory_name: factoryName,
          note: `No production update in ${order.days_since_last_update} days. Expected: ${order.expected_milestone}`,
          wechat_id: buyer.wechat_id,
        }).catch(() => {/* non-fatal */});
      }
    }
  }

  return { stale_orders: staleOrders, count: staleOrders.length, threshold_days: threshold };
});

// POST /orders/:id/qc-request — buyer creates a QC inspection request
app.post<{
  Params: { id: string };
  Body: { provider: string; inspection_type?: string; buyer_id?: string };
}>("/orders/:id/qc-request", async (req, reply) => {
  try {
    const { provider, inspection_type, buyer_id } = req.body;
    if (!provider) {
      return reply.status(400).send({ error: "provider is required" });
    }
    const qcReq = createQcRequest(req.params.id, provider, inspection_type, buyer_id);
    return reply.status(201).send(qcReq);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : msg.includes("milestone") ? 409 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /orders/:id/qc-requests — retrieve QC inspection requests for an order
app.get<{
  Params: { id: string };
}>("/orders/:id/qc-requests", async (req, reply) => {
  try {
    const requests = getQcRequestsByOrder(req.params.id);
    return { order_id: req.params.id, qc_requests: requests, count: requests.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// GET /orders/:id/qc-request — alias (singular) for backwards compat
app.get<{
  Params: { id: string };
}>("/orders/:id/qc-request", async (req, reply) => {
  try {
    const requests = getQcRequestsByOrder(req.params.id);
    return { order_id: req.params.id, qc_requests: requests, count: requests.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// POST /orders/:id/qc-result — webhook for QC provider to post pass/fail
app.post<{
  Params: { id: string };
  Body: { result: "passed" | "failed"; inspector_notes?: string; report_url?: string };
}>("/orders/:id/qc-result", async (req, reply) => {
  try {
    const { result, inspector_notes, report_url } = req.body;
    if (result !== "passed" && result !== "failed") {
      return reply.status(400).send({ error: "result must be 'passed' or 'failed'" });
    }
    const outcome = submitQcResult(req.params.id, result, { inspector_notes, report_url });
    return reply.status(200).send(outcome);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
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

// GET /factories/:id/performance — earned trust metrics computed from transactional data
app.get<{ Params: { id: string } }>("/factories/:id/performance", async (req, reply) => {
  try { return getFactoryPerformance(req.params.id); }
  catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /factories/:id/delivery-performance — delivery stats from real order data
app.get<{ Params: { id: string } }>("/factories/:id/delivery-performance", async (req, reply) => {
  try { return computeDeliveryStats(req.params.id); }
  catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /factories/:id/delivery-score — scored delivery data from factory_delivery_scores
app.get<{ Params: { id: string } }>("/factories/:id/delivery-score", async (req, reply) => {
  try { return getDeliveryScore(req.params.id); }
  catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /factories/:id/trust-score — composite 0-100 trust score
app.get<{ Params: { id: string } }>("/factories/:id/trust-score", async (req, reply) => {
  try { return computeTrustScore(req.params.id); }
  catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// POST /factories/:id/trust-score/recompute — admin recomputes trust score
app.post<{ Params: { id: string } }>("/factories/:id/trust-score/recompute", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { role: string };
  if (user.role !== "admin") {
    return reply.status(403).send({ error: "Only admins can recompute trust scores" });
  }
  try {
    const result = computeTrustScore(req.params.id);
    return result;
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /factories/:id/reviews — all buyer reviews for a factory
app.get<{ Params: { id: string } }>("/factories/:id/reviews", async (req, reply) => {
  try {
    const reviews = getReviewsByFactory(req.params.id);
    const summary = getReviewSummary(req.params.id);
    return { factory_id: req.params.id, reviews, summary, count: reviews.length };
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// POST /orders/:id/review — buyer submits a review for a delivered order
app.post<{
  Params: { id: string };
  Body: {
    buyer_id: string;
    rating: number;
    quality_rating: number;
    communication_rating: number;
    accuracy_rating: number;
    comment?: string;
  };
}>("/orders/:id/review", async (req, reply) => {
  try {
    const { buyer_id, rating, quality_rating, communication_rating, accuracy_rating, comment } = req.body;
    if (!buyer_id) return reply.status(400).send({ error: "buyer_id is required" });
    if (!rating || !quality_rating || !communication_rating || !accuracy_rating) {
      return reply.status(400).send({ error: "rating, quality_rating, communication_rating, and accuracy_rating are all required (1-5)" });
    }
    const review = createReview(
      req.params.id,
      buyer_id,
      { rating, quality_rating, communication_rating, accuracy_rating },
      comment,
    );
    // Recompute trust score after review (non-blocking side-effect)
    try { computeTrustScore(review.factory_id); } catch { /* non-fatal */ }
    return reply.status(201).send(review);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : msg.includes("already exists") ? 409 : 400;
    reply.status(status).send({ error: msg });
  }
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

// POST /webhooks/stripe — handle Stripe events with signature verification
// Updates escrow_status and escrow_events in DB on payment confirmation
app.post<{ Body: Record<string, unknown> }>("/webhooks/stripe", async (req, reply) => {
  try {
    // Verify webhook signature if STRIPE_WEBHOOK_SECRET is configured
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (sig) {
      const rawBody = JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, sig)) {
        return reply.status(401).send({ error: "Invalid Stripe webhook signature" });
      }
    }

    const event = req.body as { type: string; data: { object: Record<string, unknown> } };
    const result = handleWebhookEvent(event);
    return { received: true, result, event_type: event.type };
  } catch (e: unknown) {
    console.error("[Stripe Webhook] Error:", (e as Error).message);
    return reply.status(400).send({ error: (e as Error).message });
  }
});

// POST /orders/:id/release-escrow — manually release final escrow (buyer confirms receipt)
app.post<{ Params: { id: string } }>("/orders/:id/release-escrow", async (req, reply) => {
  try {
    // Validate milestone prerequisites before allowing final release
    const validation = validateEscrowRelease(req.params.id);
    if (!validation.valid) {
      return reply.status(409).send({
        error: validation.reason,
        escrow_status: validation.escrow_status,
      });
    }

    // Transition escrow to final_released
    const escrowEvent = transitionEscrow(req.params.id, "final_released", "manual", {
      note: "Buyer confirmed receipt — final escrow release",
    });

    // Release via Stripe using stored payment_intent_id
    const db2 = getDb();
    const orderForPi = db2.prepare("SELECT payment_intent_id, total_price_usd FROM orders WHERE order_id = ?")
      .get(req.params.id) as { payment_intent_id: string | null; total_price_usd: number } | undefined;
    const pi_id = orderForPi?.payment_intent_id ?? `pi_dev_${req.params.id.replace("ord-","").slice(0,8)}`;
    const result = await releaseEscrow(pi_id);
    await updateOrderStatus(req.params.id, "delivered", "Escrow released — buyer confirmed receipt");
    return {
      ...result,
      order_id: req.params.id,
      payment_intent_id: pi_id,
      escrow_provider: "stripe",
      escrow_event: escrowEvent,
      message: "Escrow released. Funds will be paid to factory within 2 business days.",
    };
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /orders/:id/escrow-events — full escrow audit trail
app.get<{ Params: { id: string } }>("/orders/:id/escrow-events", async (req, reply) => {
  try {
    const events = getEscrowEvents(req.params.id);
    return { order_id: req.params.id, escrow_events: events, count: events.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// POST /orders/:id/dispute — buyer or factory raises a dispute
app.post<{
  Params: { id: string };
  Body: { raised_by: "buyer" | "factory" | "platform"; reason: string; evidence_urls?: string[] };
}>("/orders/:id/dispute", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const { raised_by, reason, evidence_urls } = req.body;
    if (!raised_by || !reason) return reply.status(400).send({ error: "raised_by and reason are required" });
    const dispute = raiseDispute(req.params.id, raised_by, reason, evidence_urls);
    return reply.status(201).send(dispute);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 409;
    reply.status(status).send({ error: msg });
  }
});

// GET /orders/:id/dispute — get disputes for an order
app.get<{ Params: { id: string } }>("/orders/:id/dispute", async (req, reply) => {
  try {
    const disputes = getDisputesByOrder(req.params.id);
    return { order_id: req.params.id, disputes, count: disputes.length };
  } catch (e: unknown) {
    reply.status(404).send({ error: (e as Error).message });
  }
});

// POST /disputes/:id/resolve — platform resolves a dispute (admin)
app.post<{
  Params: { id: string };
  Body: { resolution: "refund_full" | "refund_partial" | "rejected"; resolution_notes?: string };
}>("/disputes/:id/resolve", { preHandler: [requireAuth] }, async (req, reply) => {
  try {
    const { resolution, resolution_notes } = req.body;
    if (!resolution) return reply.status(400).send({ error: "resolution is required" });
    const result = resolveDispute(req.params.id, resolution, resolution_notes);
    return result;
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// POST /orders/:id/escrow-transition — manual escrow state transition (admin)
app.post<{
  Params: { id: string };
  Body: { to_status: string; amount_usd?: number; note?: string };
}>("/orders/:id/escrow-transition", async (req, reply) => {
  try {
    const { to_status, amount_usd, note } = req.body;
    if (!to_status) return reply.status(400).send({ error: "to_status is required" });
    const event = transitionEscrow(req.params.id, to_status as Parameters<typeof transitionEscrow>[1], "manual", {
      amount_usd,
      note,
    });
    return reply.status(200).send(event);
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

// POST /rfq — broadcast RFQ to matching factories
app.post<{
  Body: {
    product_description: string;
    quantity: number;
    target_price_usd?: number;
    categories: string[];
    max_lead_time_days?: number;
    buyer_id?: string;
  };
}>("/rfq", async (req, reply) => {
  try {
    const result = createRfq(req.body);
    return reply.status(201).send(result);
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /rfq/:id — get all quote responses for an RFQ grouped by factory
app.get<{ Params: { id: string } }>("/rfq/:id", async (req, reply) => {
  try {
    return getRfqById(req.params.id);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// GET /factory/quick-reply — magic link from WeChat notification → factory-mobile.html
app.get<{ Querystring: { f?: string; a?: string; t?: string } }>("/factory/quick-reply", (req, reply) => {
  const { f = "", a = "quotes", t = "" } = req.query;
  const target = `/factory-mobile.html?f=${encodeURIComponent(f)}&a=${encodeURIComponent(a)}${t ? `&t=${encodeURIComponent(t)}` : ""}`;
  reply.redirect(target);
});

// POST /onboard — submit factory application
const USCC_REGEX = /^[0-9A-HJ-NP-RTUW]{2}\d{6}[0-9A-HJ-NP-RTUW]{10}$/;

app.post<{ Body: Record<string, unknown> }>("/onboard", async (req, reply) => {
  try {
    const d = req.body;

    // Validate USCC (required, must match standard format + check digit)
    const uscc = ((d.uscc as string) || "").trim();
    if (!uscc) return reply.status(400).send({ error: "uscc is required" });
    if (!USCC_REGEX.test(uscc)) return reply.status(400).send({ error: "Invalid USCC format. Must be 18 characters matching Chinese USCC standard." });
    const usccValidation = validateUSCC(uscc);
    if (!usccValidation.valid) return reply.status(400).send({ error: usccValidation.error });

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
      uscc,
      legal_rep: ((d.legal_rep as string) || "").trim() || undefined,
      business_license_expiry: ((d.business_license_expiry as string) || "").trim() || undefined,
    });
    return { application_id: app_result.id, status: "pending", message: "Application received. Our Shenzhen team will contact you within 2 business days." };
  } catch (e: unknown) {
    reply.status(400).send({ error: (e as Error).message });
  }
});

// GET /admin/applications — list factory applications (admin only)
app.get<{ Querystring: { status?: string } }>("/admin/applications", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { role: string };
  if (user.role !== "admin") {
    return reply.status(403).send({ error: "Only admins can list applications" });
  }
  const applications = listApplications(req.query.status);
  return { applications, count: applications.length };
});

// POST /admin/applications/:id/approve — approve and create factory record
app.post<{ Params: { id: string } }>("/admin/applications/:id/approve", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { role: string };
  if (user.role !== "admin") {
    return reply.status(403).send({ error: "Only admins can approve applications" });
  }
  try {
    const result = approveApplication(req.params.id);
    return { approved: true, factory_id: result.factory_id, message: "Application approved. Factory record created with identity fields." };
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 400;
    reply.status(status).send({ error: msg });
  }
});

// POST /admin/api-keys — generate a new API key for an AI agent partner
app.post<{
  Body: { partner_name: string; permissions?: string[]; rate_limit_per_min?: number };
}>("/admin/api-keys", { preHandler: [requireAuth] }, async (req, reply) => {
  const user = (req as unknown as Record<string, unknown>).user as { role: string };
  if (user.role !== "admin") {
    return reply.status(403).send({ error: "Only admins can generate API keys" });
  }
  const { partner_name, permissions, rate_limit_per_min } = req.body;
  if (!partner_name) return reply.status(400).send({ error: "partner_name is required" });
  const result = generateApiKey(partner_name, permissions ?? [], rate_limit_per_min ?? 60);
  return reply.status(201).send({
    id: result.id,
    key: result.key,
    partner_name: result.partner_name,
    permissions: result.permissions,
    rate_limit_per_min: result.rate_limit_per_min,
    warning: "Store this key securely. It will not be shown again.",
  });
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
