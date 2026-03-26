import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import { Factory } from "../schemas/factory.js";
import { QuoteRequest, QuoteResponse } from "../schemas/quote.js";
import { Order, EscrowStatus } from "../schemas/order.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function rowToFactory(row: Record<string, unknown>): Factory {
  return {
    id: row.id as string,
    name: row.name as string,
    name_zh: row.name_zh as string,
    location: {
      city: row.city as string,
      district: row.district as string,
    },
    categories: JSON.parse(row.categories as string) as Factory["categories"],
    moq: row.moq as number,
    lead_time_days: {
      sample: row.lead_time_sample as number,
      production: row.lead_time_production as number,
    },
    certifications: JSON.parse(row.certifications as string) as string[],
    price_tier: row.price_tier as Factory["price_tier"],
    capacity_units_per_month: row.capacity_units_per_month as number,
    accepts_foreign_buyers: Boolean(row.accepts_foreign_buyers),
    wechat_webhook_url: (row.wechat_webhook_url as string) || undefined,
    verified: Boolean(row.verified),
    rating: row.rating as number | undefined,
    uscc: (row.uscc as string) || undefined,
    legal_rep: (row.legal_rep as string) || undefined,
    business_license_expiry: (row.business_license_expiry as string) || undefined,
  };
}

function rowToQuote(row: Record<string, unknown>): QuoteResponse {
  return {
    quote_id: row.quote_id as string,
    factory_id: row.factory_id as string,
    unit_price_usd: row.unit_price_usd as number,
    total_price_usd: row.total_price_usd as number,
    lead_time_days: row.lead_time_days as number,
    moq: row.moq as number,
    valid_until: row.valid_until as string,
    notes: row.notes as string,
  };
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    order_id: row.order_id as string,
    quote_id: row.quote_id as string,
    factory_id: row.factory_id as string,
    buyer_id: row.buyer_id as string,
    status: row.status as Order["status"],
    quantity: row.quantity as number,
    unit_price_usd: row.unit_price_usd as number,
    total_price_usd: row.total_price_usd as number,
    escrow_held: Boolean(row.escrow_held),
    escrow_status: (row.escrow_status as EscrowStatus) || "pending_deposit",
    created_at: row.created_at as string,
    estimated_ship_date: row.estimated_ship_date as string,
  };
}

// ─── search ─────────────────────────────────────────────────────────────────

export interface FactoryWithScore extends Factory {
  trust_score: number | null;
}

export function searchFactories(params: {
  category?: string;
  max_moq?: number;
  price_tier?: string;
  min_rating?: number;
  verified_only?: boolean;
  sort?: string;
  min_trust_score?: number;
}): FactoryWithScore[] {
  const db = getDb();
  const conditions: string[] = [];
  const bindings: Record<string, unknown> = {};

  if (params.verified_only) {
    conditions.push("verified = 1");
  }
  if (params.price_tier) {
    conditions.push("price_tier = @price_tier");
    bindings.price_tier = params.price_tier;
  }
  if (params.max_moq !== undefined) {
    conditions.push("moq <= @max_moq");
    bindings.max_moq = params.max_moq;
  }
  if (params.min_rating !== undefined) {
    conditions.push("(rating IS NOT NULL AND rating >= @min_rating)");
    bindings.min_rating = params.min_rating;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM factories ${where} ORDER BY rating DESC`).all(bindings) as Record<string, unknown>[];

  // Post-filter by category (stored as JSON array)
  let factories: Factory[];
  if (params.category) {
    factories = rows
      .map(rowToFactory)
      .filter(f => f.categories.includes(params.category as Factory["categories"][number]));
  } else {
    factories = rows.map(rowToFactory);
  }

  // Compute trust_score for each factory
  let results: FactoryWithScore[] = factories.map(f => {
    let trust_score: number | null = null;
    try { trust_score = computeTrustScore(f.id).score; } catch { /* no score */ }
    return { ...f, trust_score };
  });

  // Filter by min_trust_score
  if (params.min_trust_score !== undefined) {
    results = results.filter(f => f.trust_score !== null && f.trust_score >= params.min_trust_score!);
  }

  // Sort by trust_score if requested
  if (params.sort === "trust_score") {
    results.sort((a, b) => (b.trust_score ?? 0) - (a.trust_score ?? 0));
  }

  return results;
}

export function getAllFactories(): Factory[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM factories ORDER BY rating DESC").all() as Record<string, unknown>[];
  return rows.map(rowToFactory);
}

// ─── single factory lookup ────────────────────────────────────────────────

export function getFactoryById(factory_id: string): Factory | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM factories WHERE id = ?").get(factory_id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToFactory(row);
}

export interface FactoryIdentity {
  uscc: string | null;
  legal_rep: string | null;
  business_license_expiry: string | null;
  verified: boolean;
  registry_url: string | null;
}

export function getFactoryIdentity(factory_id: string): FactoryIdentity | null {
  const db = getDb();
  const row = db.prepare("SELECT uscc, legal_rep, business_license_expiry, verified FROM factories WHERE id = ?").get(factory_id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const uscc = (row.uscc as string) || null;
  return {
    uscc,
    legal_rep: (row.legal_rep as string) || null,
    business_license_expiry: (row.business_license_expiry as string) || null,
    verified: Boolean(row.verified),
    registry_url: uscc ? `https://www.gsxt.gov.cn/corp-query-search-1.html?searchword=${uscc}` : null,
  };
}

// ─── USCC validation & identity completeness ─────────────────────────────

const USCC_REGEX = /^[0-9A-HJ-NP-RTUW]{2}\d{6}[0-9A-HJ-NP-RTUW]{10}$/;

/** Validate and store USCC on a factory record */
export function verifyUscc(factory_id: string, uscc: string): { uscc_valid: boolean; error?: string } {
  const db = getDb();
  const row = db.prepare("SELECT id FROM factories WHERE id = ?").get(factory_id);
  if (!row) throw new Error(`Factory ${factory_id} not found`);

  if (!USCC_REGEX.test(uscc)) {
    return { uscc_valid: false, error: "Invalid USCC format. Must be 18 characters matching Chinese USCC standard." };
  }

  db.prepare("UPDATE factories SET uscc = ? WHERE id = ?").run(uscc, factory_id);
  return { uscc_valid: true };
}

/** Set verified = 1, but only if identity fields are complete */
export function setFactoryVerified(factory_id: string): { verified: boolean; error?: string } {
  const db = getDb();
  const row = db.prepare("SELECT id, uscc, legal_rep, business_license_expiry FROM factories WHERE id = ?")
    .get(factory_id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Factory ${factory_id} not found`);

  if (!row.uscc || !row.legal_rep || !row.business_license_expiry) {
    return {
      verified: false,
      error: "Cannot verify: missing identity fields (uscc, legal_rep, business_license_expiry)",
    };
  }

  db.prepare("UPDATE factories SET verified = 1 WHERE id = ?").run(factory_id);
  return { verified: true };
}

// ─── quote ──────────────────────────────────────────────────────────────────

export function getQuote(req: QuoteRequest): QuoteResponse {
  const db = getDb();
  const factoryRow = db.prepare("SELECT * FROM factories WHERE id = ?").get(req.factory_id) as Record<string, unknown> | undefined;
  if (!factoryRow) throw new Error(`Factory ${req.factory_id} not found`);

  const factory = rowToFactory(factoryRow);

  const basePriceByTier: Record<string, number> = {
    budget: 1.2,
    mid: 2.8,
    premium: 6.5,
  };
  const unitPrice = basePriceByTier[factory.price_tier] ?? 2.0;
  const volumeDiscount =
    req.quantity >= 1000 ? 0.85 : req.quantity >= 500 ? 0.92 : 1.0;
  const finalUnitPrice = parseFloat((unitPrice * volumeDiscount).toFixed(2));
  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const quote: QuoteResponse = {
    quote_id: `q-${randomUUID().slice(0, 8)}`,
    factory_id: req.factory_id,
    unit_price_usd: finalUnitPrice,
    total_price_usd: parseFloat((finalUnitPrice * req.quantity).toFixed(2)),
    lead_time_days: factory.lead_time_days.production,
    moq: factory.moq,
    valid_until: validUntil,
    notes: `Quote for ${req.quantity}x ${req.product_description} from ${factory.name}`,
  };

  db.prepare(`
    INSERT INTO quotes (quote_id, factory_id, buyer_id, product_description, quantity,
      unit_price_usd, total_price_usd, lead_time_days, moq, valid_until, notes)
    VALUES (@quote_id, @factory_id, @buyer_id, @product_description, @quantity,
      @unit_price_usd, @total_price_usd, @lead_time_days, @moq, @valid_until, @notes)
  `).run({
    ...quote,
    buyer_id: req.buyer_id ?? null,
    product_description: req.product_description,
    quantity: req.quantity,
  });

  return quote;
}

// ─── order ──────────────────────────────────────────────────────────────────

export function placeOrder(params: { quote_id: string; buyer_id: string }): Order {
  const db = getDb();
  const quoteRow = db.prepare("SELECT * FROM quotes WHERE quote_id = ?").get(params.quote_id) as Record<string, unknown> | undefined;
  if (!quoteRow) throw new Error(`Quote ${params.quote_id} not found or expired`);

  const quote = rowToQuote(quoteRow);
  const quantity = Math.round(quote.total_price_usd / quote.unit_price_usd);
  const estimatedShipDate = new Date(Date.now() + quote.lead_time_days * 24 * 60 * 60 * 1000).toISOString();

  const order: Order = {
    order_id: `ord-${randomUUID().slice(0, 8)}`,
    quote_id: params.quote_id,
    factory_id: quote.factory_id,
    buyer_id: params.buyer_id,
    status: "pending",
    quantity,
    unit_price_usd: quote.unit_price_usd,
    total_price_usd: quote.total_price_usd,
    escrow_held: true,
    escrow_status: "pending_deposit",
    created_at: new Date().toISOString(),
    estimated_ship_date: estimatedShipDate,
  };

  db.prepare(`
    INSERT INTO orders (order_id, quote_id, factory_id, buyer_id, status, quantity,
      unit_price_usd, total_price_usd, escrow_held, escrow_status, created_at, estimated_ship_date)
    VALUES (@order_id, @quote_id, @factory_id, @buyer_id, @status, @quantity,
      @unit_price_usd, @total_price_usd, @escrow_held, @escrow_status, @created_at, @estimated_ship_date)
  `).run({ ...order, escrow_held: 1 });

  // Log initial event
  db.prepare("INSERT INTO order_events (order_id, event) VALUES (?, ?)").run(order.order_id, "order_placed");

  return order;
}

// ─── track ──────────────────────────────────────────────────────────────────

export function trackOrder(order_id: string): Order & { events: Array<{ event: string; note: string | null; photo_urls: string[] | null; created_at: string }> } {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE order_id = ?").get(order_id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Order ${order_id} not found`);

  const rawEvents = db.prepare(
    "SELECT event, note, photo_urls, created_at FROM order_events WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Array<{ event: string; note: string | null; photo_urls: string | null; created_at: string }>;

  const events = rawEvents.map(e => ({
    ...e,
    photo_urls: e.photo_urls ? JSON.parse(e.photo_urls) as string[] : null,
  }));

  return { ...rowToOrder(row), events };
}

// ─── update order status ─────────────────────────────────────────────────────

export function updateOrderStatus(order_id: string, status: Order["status"], note?: string, photo_urls?: string[]): Order {
  const db = getDb();
  db.prepare("UPDATE orders SET status = ? WHERE order_id = ?").run(status, order_id);
  const photoJson = photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null;
  db.prepare("INSERT INTO order_events (order_id, event, note, photo_urls) VALUES (?, ?, ?, ?)").run(order_id, status, note ?? null, photoJson);
  return trackOrder(order_id);
}

// ─── factory applications ────────────────────────────────────────────────────

export interface FactoryApplication {
  id: string;
  name_en: string;
  name_zh?: string;
  city: string;
  district?: string;
  categories: string[];
  certifications: string[];
  moq: number;
  capacity_units_per_month: number;
  lead_time_sample: number;
  lead_time_production: number;
  price_tier: string;
  contact_name: string;
  wechat_id: string;
  email?: string;
  phone?: string;
  description?: string;
  uscc?: string;
  legal_rep?: string;
  business_license_expiry?: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
}

export function submitApplication(data: Omit<FactoryApplication, "id" | "status" | "submitted_at">): FactoryApplication {
  const db = getDb();
  const id = `app-${randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO factory_applications
      (id, name_en, name_zh, city, district, categories, certifications, moq,
       capacity_units_per_month, lead_time_sample, lead_time_production, price_tier,
       contact_name, wechat_id, email, phone, description, uscc, legal_rep, business_license_expiry)
    VALUES
      (@id, @name_en, @name_zh, @city, @district, @categories, @certifications, @moq,
       @capacity_units_per_month, @lead_time_sample, @lead_time_production, @price_tier,
       @contact_name, @wechat_id, @email, @phone, @description, @uscc, @legal_rep, @business_license_expiry)
  `).run({
    id,
    ...data,
    categories: JSON.stringify(data.categories),
    certifications: JSON.stringify(data.certifications),
    name_zh: data.name_zh ?? null,
    district: data.district ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    description: data.description ?? null,
    uscc: data.uscc ?? null,
    legal_rep: data.legal_rep ?? null,
    business_license_expiry: data.business_license_expiry ?? null,
  });
  return getApplication(id)!;
}

export function getApplication(id: string): FactoryApplication | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM factory_applications WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    name_en: row.name_en as string,
    name_zh: row.name_zh as string | undefined,
    city: row.city as string,
    district: row.district as string | undefined,
    categories: JSON.parse(row.categories as string),
    certifications: JSON.parse(row.certifications as string),
    moq: row.moq as number,
    capacity_units_per_month: row.capacity_units_per_month as number,
    lead_time_sample: row.lead_time_sample as number,
    lead_time_production: row.lead_time_production as number,
    price_tier: row.price_tier as string,
    contact_name: row.contact_name as string,
    wechat_id: row.wechat_id as string,
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    description: row.description as string | undefined,
    uscc: row.uscc as string | undefined,
    legal_rep: row.legal_rep as string | undefined,
    business_license_expiry: row.business_license_expiry as string | undefined,
    status: row.status as "pending" | "approved" | "rejected",
    submitted_at: row.submitted_at as string,
  };
}

export function listApplications(status?: string): FactoryApplication[] {
  const db = getDb();
  const rows = status
    ? db.prepare("SELECT * FROM factory_applications WHERE status = ? ORDER BY submitted_at DESC").all(status)
    : db.prepare("SELECT * FROM factory_applications ORDER BY submitted_at DESC").all();
  return (rows as Record<string, unknown>[]).map(row => getApplication(row.id as string)!).filter(Boolean);
}

/** Approve an application: mark as approved and create a factory record carrying identity fields */
export function approveApplication(application_id: string): { factory_id: string } {
  const db = getDb();
  const app = getApplication(application_id);
  if (!app) throw new Error(`Application ${application_id} not found`);
  if (app.status !== "pending") throw new Error(`Application ${application_id} is already ${app.status}`);

  const factory_id = `fac-${randomUUID().slice(0, 8)}`;

  db.prepare(`
    INSERT INTO factories
      (id, name, name_zh, city, district, categories, moq, lead_time_sample,
       lead_time_production, certifications, price_tier, capacity_units_per_month,
       accepts_foreign_buyers, verified, wechat_id, uscc, legal_rep, business_license_expiry)
    VALUES
      (@id, @name, @name_zh, @city, @district, @categories, @moq, @lead_time_sample,
       @lead_time_production, @certifications, @price_tier, @capacity_units_per_month,
       1, 0, @wechat_id, @uscc, @legal_rep, @business_license_expiry)
  `).run({
    id: factory_id,
    name: app.name_en,
    name_zh: app.name_zh ?? null,
    city: app.city,
    district: app.district ?? null,
    categories: JSON.stringify(app.categories),
    moq: app.moq,
    lead_time_sample: app.lead_time_sample,
    lead_time_production: app.lead_time_production,
    certifications: JSON.stringify(app.certifications),
    price_tier: app.price_tier,
    capacity_units_per_month: app.capacity_units_per_month,
    wechat_id: app.wechat_id,
    uscc: app.uscc ?? null,
    legal_rep: app.legal_rep ?? null,
    business_license_expiry: app.business_license_expiry ?? null,
  });

  db.prepare("UPDATE factory_applications SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?")
    .run(application_id);

  return { factory_id };
}

// ─── quotes by factory ───────────────────────────────────────────────────────

export interface QuoteRecord {
  quote_id: string;
  factory_id: string;
  product_description: string;
  quantity: number;
  unit_price_usd: number;
  total_price_usd: number;
  lead_time_days: number;
  buyer_id: string | null;
  target_price_usd: number | null;
  created_at: string;
}

export function getQuotesByFactory(factory_id: string): QuoteRecord[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM quotes WHERE factory_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(factory_id) as Record<string, unknown>[];
  return rows.map(r => ({
    quote_id: r.id as string,
    factory_id: r.factory_id as string,
    product_description: r.product_description as string,
    quantity: r.quantity as number,
    unit_price_usd: r.unit_price_usd as number,
    total_price_usd: r.total_price_usd as number,
    lead_time_days: r.lead_time_days as number,
    buyer_id: r.buyer_id as string | null,
    target_price_usd: r.target_price_usd as number | null,
    created_at: r.created_at as string,
  }));
}

export function getOrdersByFactory(factory_id: string) {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM orders WHERE factory_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(factory_id) as Record<string, unknown>[];
  return rows.map(r => ({
    order_id: r.id as string,
    factory_id: r.factory_id as string,
    buyer_id: r.buyer_id as string,
    status: r.status as string,
    quantity: r.quantity as number,
    unit_price_usd: r.unit_price_usd as number,
    total_price_usd: r.total_price_usd as number,
    escrow_held: Boolean(r.escrow_held),
    created_at: r.created_at as string,
    estimated_ship_date: r.estimated_ship_date as string,
  }));
}

// ─── analytics ───────────────────────────────────────────────────────────────

export function getAnalytics() {
  const db = getDb();
  return {
    total_factories: (db.prepare("SELECT COUNT(*) as c FROM factories").get() as { c: number }).c,
    verified_factories: (db.prepare("SELECT COUNT(*) as c FROM factories WHERE verified=1").get() as { c: number }).c,
    total_quotes: (db.prepare("SELECT COUNT(*) as c FROM quotes").get() as { c: number }).c,
    total_orders: (db.prepare("SELECT COUNT(*) as c FROM orders").get() as { c: number }).c,
    pending_orders: (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get() as { c: number }).c,
    total_gmv: (db.prepare("SELECT COALESCE(SUM(total_price_usd),0) as s FROM orders").get() as { s: number }).s,
    avg_unit_price: (db.prepare("SELECT COALESCE(AVG(unit_price_usd),0) as a FROM quotes").get() as { a: number }).a,
    quotes_responded: (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE unit_price_usd > 0").get() as { c: number }).c,
    quote_response_rate: (() => {
      const total = (db.prepare("SELECT COUNT(*) as c FROM quotes").get() as { c: number }).c;
      const responded = (db.prepare("SELECT COUNT(*) as c FROM quotes WHERE unit_price_usd > 0").get() as { c: number }).c;
      return total > 0 ? Math.round((responded / total) * 100) : 0;
    })(),
    cities_covered: (db.prepare("SELECT COUNT(DISTINCT city) as c FROM factories").get() as { c: number }).c,
    quotes_by_factory: db.prepare(`
      SELECT f.name, f.id as factory_id, COUNT(q.quote_id) as quote_count,
             SUM(CASE WHEN q.unit_price_usd > 0 THEN 1 ELSE 0 END) as responded_count
      FROM factories f LEFT JOIN quotes q ON f.id = q.factory_id
      GROUP BY f.id ORDER BY quote_count DESC
    `).all() as Array<{ name: string; factory_id: string; quote_count: number; responded_count: number }>,
    orders_by_status: db.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_price_usd),0) as gmv
      FROM orders GROUP BY status
    `).all() as Array<{ status: string; count: number; gmv: number }>,
    top_categories: db.prepare(`
      SELECT json_each.value as category, COUNT(*) as factory_count
      FROM factories, json_each(factories.categories)
      GROUP BY json_each.value ORDER BY factory_count DESC LIMIT 6
    `).all() as Array<{ category: string; factory_count: number }>,
  };
}

// ─── Instant Quote Engine ─────────────────────────────────────────────────

export interface InstantQuoteResult {
  factory_id:       string;
  factory_name:     string;
  category:         string;
  quantity:         number;
  unit_price_usd:   number;
  total_price_usd:  number;
  lead_time_days:   number;
  express_available: boolean;
  express_days:     number | null;
  express_price_usd: number | null;
  capacity_available: number;
  confidence:       number;
  valid_hours:      number;
  pricing_basis:    string;
}

/** Compute instant binding quote from factory's pre-declared pricing rules (<1ms) */
export function getInstantQuote(factory_id: string, category: string, quantity: number): InstantQuoteResult | null {
  const db = getDb();
  const rule = db.prepare(`
    SELECT pr.*, f.name, f.name_zh, f.rating, f.verified
    FROM pricing_rules pr JOIN factories f ON f.id = pr.factory_id
    WHERE pr.factory_id = ? AND pr.category = ?
  `).get(factory_id, category) as Record<string, unknown> | undefined;

  if (!rule) return null;

  const cap = rule.capacity_available as number;
  if (cap < quantity) return null; // not enough capacity

  // Tiered pricing
  let unit_price = rule.base_price_usd as number;
  let pricing_basis = "base";
  if (rule.moq_break_2_qty && quantity >= (rule.moq_break_2_qty as number)) {
    unit_price = rule.moq_break_2_price as number;
    pricing_basis = `volume (≥${rule.moq_break_2_qty})`;
  } else if (rule.moq_break_1_qty && quantity >= (rule.moq_break_1_qty as number)) {
    unit_price = rule.moq_break_1_price as number;
    pricing_basis = `standard (≥${rule.moq_break_1_qty})`;
  }

  const lead = rule.lead_time_standard as number;
  const express_days = rule.lead_time_express as number | null;
  const express_premium = rule.express_premium_pct as number;
  const express_price = express_days ? Math.round(unit_price * (1 + express_premium) * 100) / 100 : null;

  // Confidence: higher if factory is verified + high rating + has capacity buffer
  const rating = rule.rating as number;
  const verified = rule.verified as number;
  const capacity_ratio = Math.min(cap / (quantity * 3), 1);
  const confidence = Math.round(((verified ? 0.4 : 0.2) + (rating / 5) * 0.4 + capacity_ratio * 0.2) * 100) / 100;

  return {
    factory_id,
    factory_name: (rule.name_zh as string) || (rule.name as string),
    category,
    quantity,
    unit_price_usd:   unit_price,
    total_price_usd:  Math.round(unit_price * quantity * 100) / 100,
    lead_time_days:   lead,
    express_available: !!express_days,
    express_days,
    express_price_usd: express_price ? Math.round(express_price * quantity * 100) / 100 : null,
    capacity_available: cap,
    confidence,
    valid_hours: 48,
    pricing_basis,
  };
}

// ─── Factory Capacity ─────────────────────────────────────────────────────

export interface FactoryCapacity {
  factory_id: string;
  category: string;
  available_units: number;
  capacity_per_month: number;
  base_price_usd: number;
  lead_time_standard: number;
  lead_time_express: number | null;
  valid_until: string | null;
  updated_at: string;
}

/** Get current declared capacity for a factory (all categories) */
export function getFactoryCapacity(factory_id: string): FactoryCapacity[] {
  const db = getDb();
  const factoryExists = db.prepare("SELECT 1 FROM factories WHERE id = ?").get(factory_id);
  if (!factoryExists) throw new Error(`Factory ${factory_id} not found`);

  const rows = db.prepare(
    "SELECT * FROM pricing_rules WHERE factory_id = ? ORDER BY category"
  ).all(factory_id) as Record<string, unknown>[];

  return rows.map(r => ({
    factory_id: r.factory_id as string,
    category: r.category as string,
    available_units: r.capacity_available as number,
    capacity_per_month: r.capacity_per_month as number,
    base_price_usd: r.base_price_usd as number,
    lead_time_standard: r.lead_time_standard as number,
    lead_time_express: r.lead_time_express as number | null,
    valid_until: r.valid_until as string | null,
    updated_at: r.created_at as string,
  }));
}

/** Update declared capacity for a factory/category */
export function updateFactoryCapacity(
  factory_id: string,
  category: string,
  update: { available_units?: number; available_from?: string; price_override_usd?: number }
): FactoryCapacity {
  const db = getDb();
  const factoryExists = db.prepare("SELECT 1 FROM factories WHERE id = ?").get(factory_id);
  if (!factoryExists) throw new Error(`Factory ${factory_id} not found`);

  const existing = db.prepare(
    "SELECT * FROM pricing_rules WHERE factory_id = ? AND category = ?"
  ).get(factory_id, category) as Record<string, unknown> | undefined;
  if (!existing) throw new Error(`No pricing rules for factory ${factory_id} category ${category}`);

  const sets: string[] = [];
  const bindings: Record<string, unknown> = { factory_id, category };

  if (update.available_units !== undefined) {
    sets.push("capacity_available = @available_units");
    bindings.available_units = update.available_units;
  }
  if (update.available_from !== undefined) {
    sets.push("valid_until = @available_from");
    bindings.available_from = update.available_from;
  }
  if (update.price_override_usd !== undefined) {
    sets.push("base_price_usd = @price_override_usd");
    bindings.price_override_usd = update.price_override_usd;
  }

  if (sets.length === 0) throw new Error("No fields to update");

  db.prepare(
    `UPDATE pricing_rules SET ${sets.join(", ")} WHERE factory_id = @factory_id AND category = @category`
  ).run(bindings);

  const updated = db.prepare(
    "SELECT * FROM pricing_rules WHERE factory_id = ? AND category = ?"
  ).get(factory_id, category) as Record<string, unknown>;

  return {
    factory_id: updated.factory_id as string,
    category: updated.category as string,
    available_units: updated.capacity_available as number,
    capacity_per_month: updated.capacity_per_month as number,
    base_price_usd: updated.base_price_usd as number,
    lead_time_standard: updated.lead_time_standard as number,
    lead_time_express: updated.lead_time_express as number | null,
    valid_until: updated.valid_until as string | null,
    updated_at: updated.created_at as string,
  };
}

// ─── Pricing Rules ────────────────────────────────────────────────────────

export interface PricingRule {
  id: string;
  factory_id: string;
  category: string;
  base_price_usd: number;
  moq_break_1_qty: number | null;
  moq_break_1_price: number | null;
  moq_break_2_qty: number | null;
  moq_break_2_price: number | null;
  lead_time_standard: number;
  lead_time_express: number | null;
  express_premium_pct: number;
  capacity_per_month: number;
  capacity_available: number;
  valid_until: string | null;
}

/** Get all pricing rules for a factory */
export function getPricingRules(factory_id: string): PricingRule[] {
  const db = getDb();
  const factoryExists = db.prepare("SELECT 1 FROM factories WHERE id = ?").get(factory_id);
  if (!factoryExists) throw new Error(`Factory ${factory_id} not found`);

  const rows = db.prepare(
    "SELECT * FROM pricing_rules WHERE factory_id = ? ORDER BY category"
  ).all(factory_id) as Record<string, unknown>[];

  return rows.map(r => ({
    id: r.id as string,
    factory_id: r.factory_id as string,
    category: r.category as string,
    base_price_usd: r.base_price_usd as number,
    moq_break_1_qty: r.moq_break_1_qty as number | null,
    moq_break_1_price: r.moq_break_1_price as number | null,
    moq_break_2_qty: r.moq_break_2_qty as number | null,
    moq_break_2_price: r.moq_break_2_price as number | null,
    lead_time_standard: r.lead_time_standard as number,
    lead_time_express: r.lead_time_express as number | null,
    express_premium_pct: r.express_premium_pct as number,
    capacity_per_month: r.capacity_per_month as number,
    capacity_available: r.capacity_available as number,
    valid_until: r.valid_until as string | null,
  }));
}

/** Upsert pricing rules for a factory */
export function upsertPricingRules(
  factory_id: string,
  rules: Array<{
    category: string;
    min_qty?: number;
    max_qty?: number;
    unit_price_usd: number;
    lead_time_days?: number;
  }>
): PricingRule[] {
  const db = getDb();
  const factoryExists = db.prepare("SELECT 1 FROM factories WHERE id = ?").get(factory_id);
  if (!factoryExists) throw new Error(`Factory ${factory_id} not found`);

  for (const rule of rules) {
    const existing = db.prepare(
      "SELECT * FROM pricing_rules WHERE factory_id = ? AND category = ?"
    ).get(factory_id, rule.category) as Record<string, unknown> | undefined;

    if (existing) {
      const sets: string[] = ["base_price_usd = @price"];
      const bindings: Record<string, unknown> = {
        factory_id,
        category: rule.category,
        price: rule.unit_price_usd,
      };
      if (rule.min_qty !== undefined) {
        sets.push("moq_break_1_qty = @min_qty");
        bindings.min_qty = rule.min_qty;
      }
      if (rule.max_qty !== undefined) {
        sets.push("capacity_available = @max_qty");
        bindings.max_qty = rule.max_qty;
      }
      if (rule.lead_time_days !== undefined) {
        sets.push("lead_time_standard = @lead_time");
        bindings.lead_time = rule.lead_time_days;
      }
      db.prepare(
        `UPDATE pricing_rules SET ${sets.join(", ")} WHERE factory_id = @factory_id AND category = @category`
      ).run(bindings);
    } else {
      const id = `pr-${randomUUID().slice(0, 8)}`;
      db.prepare(`
        INSERT INTO pricing_rules (id, factory_id, category, base_price_usd, moq_break_1_qty, lead_time_standard, capacity_per_month, capacity_available)
        VALUES (@id, @factory_id, @category, @price, @min_qty, @lead_time, @cap, @cap_avail)
      `).run({
        id,
        factory_id,
        category: rule.category,
        price: rule.unit_price_usd,
        min_qty: rule.min_qty ?? null,
        lead_time: rule.lead_time_days ?? 25,
        cap: rule.max_qty ?? 10000,
        cap_avail: rule.max_qty ?? 10000,
      });
    }
  }

  return getPricingRules(factory_id);
}

// ─── Order Milestones ─────────────────────────────────────────────────────

export type MilestoneType =
  | "material_received"
  | "production_started"
  | "qc_in_progress"
  | "qc_pass"
  | "qc_fail"
  | "ready_for_shipment"
  | "shipped";

const MILESTONE_ORDER: Record<MilestoneType, MilestoneType[]> = {
  material_received:   [],
  production_started:  ["material_received"],
  qc_in_progress:      ["production_started"],
  qc_pass:             ["qc_in_progress"],
  qc_fail:             ["qc_in_progress"],
  ready_for_shipment:  ["qc_pass"],
  shipped:             ["ready_for_shipment"],
};

const VALID_MILESTONES = Object.keys(MILESTONE_ORDER) as MilestoneType[];

export interface OrderMilestone {
  id: number;
  order_id: string;
  milestone: MilestoneType;
  photo_urls: string[] | null;
  note: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface MilestoneResult {
  milestone: OrderMilestone;
  escrow_transition?: EscrowEvent;
}

export function createOrderMilestone(
  order_id: string,
  milestone: string,
  reported_by: string,
  photo_urls?: string[],
  note?: string,
): MilestoneResult {
  const db = getDb();

  // Validate milestone enum
  if (!VALID_MILESTONES.includes(milestone as MilestoneType)) {
    throw new Error(`Invalid milestone '${milestone}'. Must be one of: ${VALID_MILESTONES.join(", ")}`);
  }
  const ms = milestone as MilestoneType;

  // Verify order exists
  const orderRow = db.prepare("SELECT order_id, escrow_status, total_price_usd FROM orders WHERE order_id = ?")
    .get(order_id) as Record<string, unknown> | undefined;
  if (!orderRow) throw new Error(`Order ${order_id} not found`);

  // Validate milestone ordering
  const existing = db.prepare(
    "SELECT milestone FROM order_milestones WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Array<{ milestone: string }>;
  const existingMilestones = existing.map(e => e.milestone);

  const prerequisites = MILESTONE_ORDER[ms];
  if (prerequisites.length > 0) {
    const met = prerequisites.some(p => existingMilestones.includes(p));
    if (!met) {
      throw new Error(
        `Cannot record '${ms}': requires one of [${prerequisites.join(", ")}] first`
      );
    }
  }

  // Block factory self-reporting qc_pass if an external QC request exists
  if (ms === "qc_pass" && hasExternalQcRequest(order_id)) {
    throw new Error(
      `Cannot self-report 'qc_pass': an external QC inspection request exists for order ${order_id}. Only the QC provider callback can record pass/fail.`
    );
  }

  const photoJson = photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null;

  const result = db.prepare(`
    INSERT INTO order_milestones (order_id, milestone, photo_urls, note, reported_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(order_id, ms, photoJson, note ?? null, reported_by);

  const milestoneRecord = getMilestoneById(Number(result.lastInsertRowid))!;

  // Auto-trigger escrow transition if this milestone has one configured
  let escrow_transition: EscrowEvent | undefined;
  const trigger = MILESTONE_ESCROW_TRIGGERS[ms];
  if (trigger) {
    const currentEscrow = (orderRow.escrow_status as EscrowStatus) || "pending_deposit";
    if (currentEscrow === trigger.from) {
      escrow_transition = transitionEscrow(order_id, trigger.to, "milestone", {
        amount_usd: orderRow.total_price_usd as number,
        note: `Auto-triggered by milestone '${ms}'`,
      });
    }
  }

  return { milestone: milestoneRecord, escrow_transition };
}

function getMilestoneById(id: number): OrderMilestone | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM order_milestones WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToMilestone(row);
}

function rowToMilestone(row: Record<string, unknown>): OrderMilestone {
  return {
    id: row.id as number,
    order_id: row.order_id as string,
    milestone: row.milestone as MilestoneType,
    photo_urls: row.photo_urls ? JSON.parse(row.photo_urls as string) as string[] : null,
    note: row.note as string | null,
    reported_by: row.reported_by as string | null,
    created_at: row.created_at as string,
  };
}

export function getOrderMilestones(order_id: string): OrderMilestone[] {
  const db = getDb();
  const order = db.prepare("SELECT order_id FROM orders WHERE order_id = ?").get(order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);

  const rows = db.prepare(
    "SELECT * FROM order_milestones WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Record<string, unknown>[];
  return rows.map(rowToMilestone);
}

// ─── QC Inspection Requests ──────────────────────────────────────────────

export type QcProvider = "qima" | "sgs" | "bureau_veritas" | "tuv" | "manual";
export type QcStatus = "requested" | "scheduled" | "in_progress" | "passed" | "failed" | "cancelled";

const VALID_QC_PROVIDERS: QcProvider[] = ["qima", "sgs", "bureau_veritas", "tuv", "manual"];
const VALID_QC_STATUSES: QcStatus[] = ["requested", "scheduled", "in_progress", "passed", "failed", "cancelled"];

export interface QcRequest {
  id: number;
  order_id: string;
  factory_id: string;
  buyer_id: string | null;
  provider: QcProvider;
  milestone_trigger: string;
  status: QcStatus;
  inspector_notes: string | null;
  report_url: string | null;
  requested_at: string;
  completed_at: string | null;
}

function rowToQcRequest(row: Record<string, unknown>): QcRequest {
  return {
    id: row.id as number,
    order_id: row.order_id as string,
    factory_id: row.factory_id as string,
    buyer_id: (row.buyer_id as string) || null,
    provider: row.provider as QcProvider,
    milestone_trigger: (row.milestone_trigger as string) || "qc_in_progress",
    status: row.status as QcStatus,
    inspector_notes: (row.inspector_notes as string) || null,
    report_url: (row.report_url as string) || null,
    requested_at: row.requested_at as string,
    completed_at: (row.completed_at as string) || null,
  };
}

/** Buyer creates a QC inspection request. Order must be in in_production or qc status. */
export function createQcRequest(
  order_id: string,
  provider: string,
  buyer_id?: string,
): QcRequest {
  const db = getDb();

  // Validate provider enum
  if (!VALID_QC_PROVIDERS.includes(provider as QcProvider)) {
    throw new Error(`Invalid provider '${provider}'. Must be one of: ${VALID_QC_PROVIDERS.join(", ")}`);
  }

  // Verify order exists and check status
  const orderRow = db.prepare("SELECT order_id, factory_id, buyer_id, status FROM orders WHERE order_id = ?")
    .get(order_id) as Record<string, unknown> | undefined;
  if (!orderRow) throw new Error(`Order ${order_id} not found`);

  const orderStatus = orderRow.status as string;
  if (orderStatus !== "in_production" && orderStatus !== "qc") {
    throw new Error(`Order ${order_id} is in '${orderStatus}' status. QC request requires 'in_production' or 'qc' status.`);
  }

  const effectiveBuyerId = buyer_id || (orderRow.buyer_id as string) || null;

  const result = db.prepare(`
    INSERT INTO qc_requests (order_id, factory_id, buyer_id, provider)
    VALUES (?, ?, ?, ?)
  `).run(order_id, orderRow.factory_id as string, effectiveBuyerId, provider);

  return getQcRequestById(Number(result.lastInsertRowid))!;
}

function getQcRequestById(id: number): QcRequest | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM qc_requests WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToQcRequest(row);
}

export function getQcRequestsByOrder(order_id: string): QcRequest[] {
  const db = getDb();
  const order = db.prepare("SELECT order_id FROM orders WHERE order_id = ?").get(order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);

  const rows = db.prepare(
    "SELECT * FROM qc_requests WHERE order_id = ? ORDER BY requested_at ASC"
  ).all(order_id) as Record<string, unknown>[];
  return rows.map(rowToQcRequest);
}

/** Webhook callback: QC provider posts pass/fail result. Auto-creates qc_pass or qc_fail milestone. */
export function submitQcResult(
  order_id: string,
  result: "passed" | "failed",
  opts?: { inspector_notes?: string; report_url?: string },
): { qc_request: QcRequest; milestone: OrderMilestone; escrow_transition?: EscrowEvent } {
  const db = getDb();

  // Find the active (non-terminal) QC request for this order
  const qcRow = db.prepare(`
    SELECT * FROM qc_requests WHERE order_id = ? AND status NOT IN ('passed','failed','cancelled')
    ORDER BY requested_at DESC LIMIT 1
  `).get(order_id) as Record<string, unknown> | undefined;
  if (!qcRow) throw new Error(`No active QC request found for order ${order_id}`);

  const qcId = qcRow.id as number;

  // Update QC request status
  db.prepare(`
    UPDATE qc_requests SET status = ?, inspector_notes = ?, report_url = ?, completed_at = datetime('now')
    WHERE id = ?
  `).run(result, opts?.inspector_notes ?? null, opts?.report_url ?? null, qcId);

  const updatedQcRequest = getQcRequestById(qcId)!;

  // Auto-create the corresponding milestone (bypass the factory-block since this is from external provider)
  const milestoneType: MilestoneType = result === "passed" ? "qc_pass" : "qc_fail";

  // Verify order exists
  const orderRow = db.prepare("SELECT order_id, escrow_status, total_price_usd FROM orders WHERE order_id = ?")
    .get(order_id) as Record<string, unknown> | undefined;
  if (!orderRow) throw new Error(`Order ${order_id} not found`);

  // Ensure qc_in_progress prerequisite is met
  const existing = db.prepare(
    "SELECT milestone FROM order_milestones WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Array<{ milestone: string }>;
  const existingMilestones = existing.map(e => e.milestone);

  // If qc_in_progress not yet recorded, auto-create it
  if (!existingMilestones.includes("qc_in_progress")) {
    db.prepare(`
      INSERT INTO order_milestones (order_id, milestone, note, reported_by)
      VALUES (?, 'qc_in_progress', 'Auto-created by QC provider callback', 'qc_provider')
    `).run(order_id);
  }

  const photoJson = null;
  const milestoneNote = `QC ${result} by ${updatedQcRequest.provider}${opts?.inspector_notes ? ` — ${opts.inspector_notes}` : ""}`;
  const milestoneResult = db.prepare(`
    INSERT INTO order_milestones (order_id, milestone, photo_urls, note, reported_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(order_id, milestoneType, photoJson, milestoneNote, `qc_provider:${updatedQcRequest.provider}`);

  const milestoneRecord = getMilestoneById(Number(milestoneResult.lastInsertRowid))!;

  // Auto-trigger escrow transition if applicable
  let escrow_transition: EscrowEvent | undefined;
  const trigger = MILESTONE_ESCROW_TRIGGERS[milestoneType];
  if (trigger) {
    const currentEscrow = (orderRow.escrow_status as EscrowStatus) || "pending_deposit";
    if (currentEscrow === trigger.from) {
      escrow_transition = transitionEscrow(order_id, trigger.to, "milestone", {
        amount_usd: orderRow.total_price_usd as number,
        note: `Auto-triggered by QC provider milestone '${milestoneType}'`,
      });
    }
  }

  return { qc_request: updatedQcRequest, milestone: milestoneRecord, escrow_transition };
}

/** Check if an external QC request exists for an order (non-manual, non-terminal) */
export function hasExternalQcRequest(order_id: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM qc_requests WHERE order_id = ? AND provider != 'manual'
    LIMIT 1
  `).get(order_id);
  return !!row;
}

/** Check if an external provider has recorded qc_pass for this order */
function hasExternalQcPass(order_id: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT 1 FROM qc_requests WHERE order_id = ? AND provider != 'manual' AND status = 'passed'
    LIMIT 1
  `).get(order_id);
  return !!row;
}

// ─── Escrow State Machine ─────────────────────────────────────────────────

/** Valid state transitions for the escrow state machine */
const ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  pending_deposit:     ["deposit_held", "refunded"],
  deposit_held:        ["production_released", "disputed", "refunded"],
  production_released: ["final_released", "disputed"],
  final_released:      [],
  disputed:            ["refunded", "production_released", "final_released"],
  refunded:            [],
};

/** Milestone that auto-triggers escrow transitions */
const MILESTONE_ESCROW_TRIGGERS: Partial<Record<MilestoneType, { from: EscrowStatus; to: EscrowStatus }>> = {
  production_started: { from: "deposit_held", to: "production_released" },
};

export type EscrowTrigger = "manual" | "milestone" | "system";

export interface EscrowEvent {
  id: number;
  order_id: string;
  from_status: EscrowStatus;
  to_status: EscrowStatus;
  trigger: EscrowTrigger;
  amount_usd: number | null;
  note: string | null;
  created_at: string;
}

function rowToEscrowEvent(row: Record<string, unknown>): EscrowEvent {
  return {
    id: row.id as number,
    order_id: row.order_id as string,
    from_status: row.from_status as EscrowStatus,
    to_status: row.to_status as EscrowStatus,
    trigger: row.trigger as EscrowTrigger,
    amount_usd: row.amount_usd as number | null,
    note: row.note as string | null,
    created_at: row.created_at as string,
  };
}

/** Transition escrow status with validation, logging, and webhook notification */
export function transitionEscrow(
  order_id: string,
  to_status: EscrowStatus,
  trigger: EscrowTrigger,
  opts?: { amount_usd?: number; note?: string },
): EscrowEvent {
  const db = getDb();
  const row = db.prepare("SELECT order_id, escrow_status, total_price_usd, buyer_id FROM orders WHERE order_id = ?")
    .get(order_id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Order ${order_id} not found`);

  const from_status = (row.escrow_status as EscrowStatus) || "pending_deposit";
  const allowed = ESCROW_TRANSITIONS[from_status];
  if (!allowed.includes(to_status)) {
    throw new Error(
      `Invalid escrow transition: ${from_status} → ${to_status}. Allowed: [${allowed.join(", ")}]`
    );
  }

  // Update order's escrow_status
  db.prepare("UPDATE orders SET escrow_status = ? WHERE order_id = ?").run(to_status, order_id);

  // Log the event
  const result = db.prepare(`
    INSERT INTO escrow_events (order_id, from_status, to_status, trigger, amount_usd, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(order_id, from_status, to_status, trigger, opts?.amount_usd ?? null, opts?.note ?? null);

  const event = getEscrowEventById(Number(result.lastInsertRowid))!;

  // Fire webhook notification to buyer (async, non-blocking)
  console.log(`[Escrow] ${order_id}: ${from_status} → ${to_status} (trigger: ${trigger})`);

  return event;
}

function getEscrowEventById(id: number): EscrowEvent | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM escrow_events WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToEscrowEvent(row);
}

/** Get all escrow events for an order */
export function getEscrowEvents(order_id: string): EscrowEvent[] {
  const db = getDb();
  const order = db.prepare("SELECT order_id FROM orders WHERE order_id = ?").get(order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);

  const rows = db.prepare(
    "SELECT * FROM escrow_events WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Record<string, unknown>[];
  return rows.map(rowToEscrowEvent);
}

/** Raise a dispute on an order — transitions escrow to 'disputed' */
export function raiseDispute(
  order_id: string,
  raised_by: "buyer" | "factory" | "platform",
  reason: string,
  evidence_urls?: string[]
): Record<string, unknown> {
  const db = getDb();
  const order = db.prepare("SELECT order_id, escrow_status FROM orders WHERE order_id = ?").get(order_id) as Record<string, unknown> | undefined;
  if (!order) throw new Error(`Order ${order_id} not found`);

  // Transition escrow to disputed state
  transitionEscrow(order_id, "disputed", "manual", {
    note: `Dispute raised by ${raised_by}: ${reason.slice(0, 100)}`,
  });

  const dispute_id = `dsp-${Date.now().toString(36)}`;
  db.prepare(`
    INSERT INTO disputes (id, order_id, raised_by, reason, evidence_urls)
    VALUES (?, ?, ?, ?, ?)
  `).run(dispute_id, order_id, raised_by, reason, JSON.stringify(evidence_urls ?? []));

  return db.prepare("SELECT * FROM disputes WHERE id = ?").get(dispute_id) as Record<string, unknown>;
}

/** Get dispute(s) for an order */
export function getDisputesByOrder(order_id: string): Record<string, unknown>[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM disputes WHERE order_id = ? ORDER BY raised_at DESC").all(order_id) as Record<string, unknown>[]).map(d => ({
    ...d,
    evidence_urls: d.evidence_urls ? JSON.parse(d.evidence_urls as string) : [],
  }));
}

/** Resolve a dispute */
export function resolveDispute(
  dispute_id: string,
  resolution: "refund_full" | "refund_partial" | "rejected",
  resolution_notes?: string
): Record<string, unknown> {
  const db = getDb();
  const dispute = db.prepare("SELECT * FROM disputes WHERE id = ?").get(dispute_id) as Record<string, unknown> | undefined;
  if (!dispute) throw new Error(`Dispute ${dispute_id} not found`);
  if (dispute.status === "resolved") throw new Error(`Dispute ${dispute_id} is already resolved`);

  db.prepare(`
    UPDATE disputes SET status = 'resolved', resolution = ?, resolution_notes = ?, resolved_at = datetime('now') WHERE id = ?
  `).run(resolution, resolution_notes ?? null, dispute_id);

  // Transition escrow based on resolution
  const escrow_to = resolution === "rejected" ? "final_released" : "refunded";
  transitionEscrow(dispute.order_id as string, escrow_to, "manual", {
    note: `Dispute ${dispute_id} resolved: ${resolution}`,
  });

  return db.prepare("SELECT * FROM disputes WHERE id = ?").get(dispute_id) as Record<string, unknown>;
}

/** Validate that milestones support final escrow release (requires qc_pass) */
export function validateEscrowRelease(order_id: string): { valid: boolean; reason?: string; escrow_status: EscrowStatus } {
  const db = getDb();
  const orderRow = db.prepare("SELECT order_id, escrow_status FROM orders WHERE order_id = ?")
    .get(order_id) as Record<string, unknown> | undefined;
  if (!orderRow) throw new Error(`Order ${order_id} not found`);

  const escrow_status = (orderRow.escrow_status as EscrowStatus) || "pending_deposit";

  // Can only release final from production_released
  if (escrow_status !== "production_released") {
    return {
      valid: false,
      reason: `Escrow is '${escrow_status}' — must be 'production_released' before final release`,
      escrow_status,
    };
  }

  // Check that qc_pass milestone exists
  const milestones = db.prepare(
    "SELECT milestone FROM order_milestones WHERE order_id = ?"
  ).all(order_id) as Array<{ milestone: string }>;
  const milestoneNames = milestones.map(m => m.milestone);

  if (!milestoneNames.includes("qc_pass")) {
    return {
      valid: false,
      reason: `Cannot release final payment: 'qc_pass' milestone required. Current milestones: [${milestoneNames.join(", ") || "none"}]`,
      escrow_status,
    };
  }

  // If an external QC request exists, require the pass to come from the external provider
  if (hasExternalQcRequest(order_id) && !hasExternalQcPass(order_id)) {
    return {
      valid: false,
      reason: `Cannot release final payment: an external QC inspection is required but no 'passed' result from the QC provider has been recorded.`,
      escrow_status,
    };
  }

  return { valid: true, escrow_status };
}

// ─── Factory Performance ──────────────────────────────────────────────────

export interface FactoryPerformance {
  factory_id: string;
  on_time_delivery_rate: number | null;
  avg_lead_time_accuracy_days: number | null;
  qc_pass_rate: number | null;
  milestone_responsiveness_hours: number | null;
  total_orders_completed: number;
}

export function getFactoryPerformance(factory_id: string): FactoryPerformance {
  const db = getDb();
  const factoryExists = db.prepare("SELECT 1 FROM factories WHERE id = ?").get(factory_id);
  if (!factoryExists) throw new Error(`Factory ${factory_id} not found`);

  // Total completed orders (status = 'delivered' or has 'shipped' milestone)
  const completedRows = db.prepare(`
    SELECT o.order_id, o.estimated_ship_date
    FROM orders o
    WHERE o.factory_id = ? AND (o.status = 'delivered' OR o.status = 'shipped'
      OR EXISTS (SELECT 1 FROM order_milestones m WHERE m.order_id = o.order_id AND m.milestone = 'shipped'))
  `).all(factory_id) as Array<{ order_id: string; estimated_ship_date: string }>;

  const total_orders_completed = completedRows.length;

  // On-time delivery rate: orders where shipped milestone <= estimated_ship_date
  let on_time_delivery_rate: number | null = null;
  let avg_lead_time_accuracy_days: number | null = null;

  if (total_orders_completed > 0) {
    let onTimeCount = 0;
    let totalDelta = 0;
    let deltaCount = 0;

    for (const order of completedRows) {
      const shippedMilestone = db.prepare(
        "SELECT created_at FROM order_milestones WHERE order_id = ? AND milestone = 'shipped' LIMIT 1"
      ).get(order.order_id) as { created_at: string } | undefined;

      if (shippedMilestone && order.estimated_ship_date) {
        const shippedDate = new Date(shippedMilestone.created_at).getTime();
        const estimatedDate = new Date(order.estimated_ship_date).getTime();
        if (shippedDate <= estimatedDate) onTimeCount++;
        const deltaDays = (shippedDate - estimatedDate) / (1000 * 60 * 60 * 24);
        totalDelta += deltaDays;
        deltaCount++;
      }
    }

    on_time_delivery_rate = deltaCount > 0 ? Math.round((onTimeCount / deltaCount) * 10000) / 10000 : null;
    avg_lead_time_accuracy_days = deltaCount > 0 ? Math.round((totalDelta / deltaCount) * 100) / 100 : null;
  }

  // QC pass rate: passed / total terminal QC requests for this factory
  const qcTotal = db.prepare(
    "SELECT COUNT(*) as c FROM qc_requests WHERE factory_id = ? AND status IN ('passed','failed')"
  ).get(factory_id) as { c: number };
  const qcPassed = db.prepare(
    "SELECT COUNT(*) as c FROM qc_requests WHERE factory_id = ? AND status = 'passed'"
  ).get(factory_id) as { c: number };
  const qc_pass_rate = qcTotal.c > 0 ? Math.round((qcPassed.c / qcTotal.c) * 10000) / 10000 : null;

  // Milestone responsiveness: average hours between consecutive milestones per order
  let milestone_responsiveness_hours: number | null = null;
  const orderIds = db.prepare(
    "SELECT DISTINCT order_id FROM order_milestones WHERE order_id IN (SELECT order_id FROM orders WHERE factory_id = ?)"
  ).all(factory_id) as Array<{ order_id: string }>;

  let totalGapHours = 0;
  let gapCount = 0;

  for (const { order_id } of orderIds) {
    const milestones = db.prepare(
      "SELECT created_at FROM order_milestones WHERE order_id = ? ORDER BY created_at ASC"
    ).all(order_id) as Array<{ created_at: string }>;

    for (let i = 1; i < milestones.length; i++) {
      const prev = new Date(milestones[i - 1].created_at).getTime();
      const curr = new Date(milestones[i].created_at).getTime();
      totalGapHours += (curr - prev) / (1000 * 60 * 60);
      gapCount++;
    }
  }

  milestone_responsiveness_hours = gapCount > 0 ? Math.round((totalGapHours / gapCount) * 100) / 100 : null;

  return {
    factory_id,
    on_time_delivery_rate,
    avg_lead_time_accuracy_days,
    qc_pass_rate,
    milestone_responsiveness_hours,
    total_orders_completed,
  };
}

// ─── Trust Score ──────────────────────────────────────────────────────────

export interface TrustScore {
  factory_id: string;
  score: number;
  breakdown: {
    identity: number;       // 0-30
    verification: number;   // 0-10
    certifications: number; // 0-20
    performance: number;    // 0-40
  };
}

export function computeTrustScore(factory_id: string): TrustScore {
  const db = getDb();
  const row = db.prepare("SELECT * FROM factories WHERE id = ?").get(factory_id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Factory ${factory_id} not found`);

  // Identity completeness: 10 pts each for uscc, legal_rep, business_license_expiry (max 30)
  let identity = 0;
  if (row.uscc) identity += 10;
  if (row.legal_rep) identity += 10;
  if (row.business_license_expiry) identity += 10;

  // Verification status: 10 pts
  const verification = row.verified ? 10 : 0;

  // Certifications: 5 pts each, up to 20 pts (4+ certs)
  const certs: string[] = row.certifications ? JSON.parse(row.certifications as string) : [];
  const certifications = Math.min(certs.length * 5, 20);

  // Performance: on_time_delivery_rate + qc_pass_rate + milestone_responsiveness = 40 pts
  let performance = 0;
  try {
    const perf = getFactoryPerformance(factory_id);
    // on_time_delivery_rate: 0-1 → 0-15 pts
    if (perf.on_time_delivery_rate !== null) {
      performance += Math.round(perf.on_time_delivery_rate * 15);
    }
    // qc_pass_rate: 0-1 → 0-15 pts
    if (perf.qc_pass_rate !== null) {
      performance += Math.round(perf.qc_pass_rate * 15);
    }
    // milestone_responsiveness: lower is better. ≤24h = 10, ≤72h = 5, else 0
    if (perf.milestone_responsiveness_hours !== null) {
      if (perf.milestone_responsiveness_hours <= 24) performance += 10;
      else if (perf.milestone_responsiveness_hours <= 72) performance += 5;
    }
  } catch {
    // no performance data — 0 pts
  }

  const score = identity + verification + certifications + performance;

  return {
    factory_id,
    score,
    breakdown: { identity, verification, certifications, performance },
  };
}

// ─── Order Health ────────────────────────────────────────────────────────

export interface OrderHealth {
  stale: boolean;
  days_since_update: number;
  current_milestone: string | null;
  next_expected_milestone: string;
  on_track: boolean;
  delay_days: number | null;
}

const MILESTONE_HAPPY_PATH: MilestoneType[] = [
  "material_received",
  "production_started",
  "qc_in_progress",
  "qc_pass",
  "ready_for_shipment",
  "shipped",
];

const ACTIVE_STATUSES = ["pending", "confirmed", "in_production", "qc"];

export function getOrderHealth(order_id: string): OrderHealth {
  const db = getDb();

  const order = db.prepare(
    "SELECT order_id, status, estimated_ship_date, created_at FROM orders WHERE order_id = ?"
  ).get(order_id) as Record<string, unknown> | undefined;
  if (!order) throw new Error(`Order ${order_id} not found`);

  const milestones = db.prepare(
    "SELECT milestone, created_at FROM order_milestones WHERE order_id = ? ORDER BY created_at DESC"
  ).all(order_id) as Array<{ milestone: string; created_at: string }>;

  const now = new Date();

  // Latest milestone & days since update
  const latest = milestones.length > 0 ? milestones[0] : null;
  const lastUpdateDate = latest
    ? new Date(latest.created_at)
    : new Date(order.created_at as string);
  const daysSinceUpdate = Math.floor(
    (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const currentMilestone = latest ? latest.milestone : null;

  // Staleness: no milestone in 5+ days while order is active
  const isActive = ACTIVE_STATUSES.includes(order.status as string);
  const stale = isActive && daysSinceUpdate >= 5;

  // Next expected milestone from the happy path
  let nextExpected: string;
  if (!currentMilestone) {
    nextExpected = "material_received";
  } else if (currentMilestone === "qc_fail") {
    // After QC fail, expect another QC round
    nextExpected = "qc_in_progress";
  } else {
    const idx = MILESTONE_HAPPY_PATH.indexOf(currentMilestone as MilestoneType);
    if (idx >= 0 && idx < MILESTONE_HAPPY_PATH.length - 1) {
      nextExpected = MILESTONE_HAPPY_PATH[idx + 1];
    } else {
      nextExpected = "complete";
    }
  }

  // On-track: compare against estimated_ship_date
  let onTrack = true;
  let delayDays: number | null = null;
  const estimatedShipDate = order.estimated_ship_date as string | null;

  if (estimatedShipDate) {
    const shipDate = new Date(estimatedShipDate);
    if (now > shipDate && currentMilestone !== "shipped") {
      onTrack = false;
      delayDays = Math.floor(
        (now.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }

  return {
    stale,
    days_since_update: daysSinceUpdate,
    current_milestone: currentMilestone,
    next_expected_milestone: nextExpected,
    on_track: onTrack,
    delay_days: delayDays,
  };
}

// ─── RFQ (Request for Quotation) Broadcast ────────────────────────────────

export interface RfqRequest {
  product_description: string;
  quantity: number;
  target_price_usd?: number;
  categories: string[];
  max_lead_time_days?: number;
  buyer_id?: string;
}

export interface RfqResult {
  rfq_id: string;
  status: string;
  matched_factory_ids: string[];
  quotes_created: number;
  created_at: string;
}

/** Create an RFQ: auto-match factories by category + MOQ + capacity, create pending quotes */
export function createRfq(req: RfqRequest): RfqResult {
  const db = getDb();

  if (!req.categories || req.categories.length === 0) {
    throw new Error("categories[] is required and must not be empty");
  }
  if (!req.quantity || req.quantity <= 0) {
    throw new Error("quantity must be a positive integer");
  }

  const rfq_id = `rfq-${randomUUID().slice(0, 8)}`;
  const created_at = new Date().toISOString();

  db.prepare(`
    INSERT INTO rfqs (rfq_id, buyer_id, product_description, quantity, target_price_usd, categories, max_lead_time_days, created_at)
    VALUES (@rfq_id, @buyer_id, @product_description, @quantity, @target_price_usd, @categories, @max_lead_time_days, @created_at)
  `).run({
    rfq_id,
    buyer_id: req.buyer_id ?? null,
    product_description: req.product_description ?? null,
    quantity: req.quantity,
    target_price_usd: req.target_price_usd ?? null,
    categories: JSON.stringify(req.categories),
    max_lead_time_days: req.max_lead_time_days ?? null,
    created_at,
  });

  // Match factories: category overlap + MOQ ≤ quantity + capacity ≥ quantity
  const allFactories = db.prepare("SELECT * FROM factories").all() as Record<string, unknown>[];

  const matched: string[] = [];

  for (const row of allFactories) {
    const factory = rowToFactory(row);

    // Category match: at least one requested category must be in factory's categories
    const factoryCategories = factory.categories as string[];
    const hasCategory = req.categories.some(c => factoryCategories.includes(c as Factory["categories"][number]));
    if (!hasCategory) continue;

    // MOQ check
    if (factory.moq > req.quantity) continue;

    // Capacity check
    if (factory.capacity_units_per_month < req.quantity) continue;

    // Lead time check (if specified): use production lead time
    if (req.max_lead_time_days && factory.lead_time_days.production > req.max_lead_time_days) continue;

    matched.push(factory.id);
  }

  // Create one pending quote per matched factory
  const insertQuote = db.prepare(`
    INSERT INTO quotes (quote_id, factory_id, buyer_id, product_description, quantity,
      unit_price_usd, total_price_usd, lead_time_days, moq, valid_until, notes, rfq_id)
    VALUES (@quote_id, @factory_id, @buyer_id, @product_description, @quantity,
      @unit_price_usd, @total_price_usd, @lead_time_days, @moq, @valid_until, @notes, @rfq_id)
  `);

  const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const createQuotes = db.transaction((factoryIds: string[]) => {
    for (const fid of factoryIds) {
      const quote_id = `q-${randomUUID().slice(0, 8)}`;
      insertQuote.run({
        quote_id,
        factory_id: fid,
        buyer_id: req.buyer_id ?? null,
        product_description: req.product_description ?? null,
        quantity: req.quantity,
        unit_price_usd: 0,        // pending — factory hasn't responded yet
        total_price_usd: 0,
        lead_time_days: 0,
        moq: 0,
        valid_until: validUntil,
        notes: `RFQ broadcast — awaiting factory response`,
        rfq_id,
      });
    }
  });
  createQuotes(matched);

  return {
    rfq_id,
    status: "open",
    matched_factory_ids: matched,
    quotes_created: matched.length,
    created_at,
  };
}

/** Get all quote responses for an RFQ, grouped by factory with trust scores */
export function getRfqById(rfq_id: string) {
  const db = getDb();

  const rfq = db.prepare("SELECT * FROM rfqs WHERE rfq_id = ?").get(rfq_id) as Record<string, unknown> | undefined;
  if (!rfq) throw new Error(`RFQ ${rfq_id} not found`);

  const quotes = db.prepare(
    "SELECT q.*, f.name as factory_name, f.name_zh as factory_name_zh FROM quotes q JOIN factories f ON f.id = q.factory_id WHERE q.rfq_id = ? ORDER BY q.unit_price_usd ASC, q.lead_time_days ASC"
  ).all(rfq_id) as Record<string, unknown>[];

  // Group by factory
  const byFactory: Record<string, { factory_id: string; factory_name: string; trust_score: number | null; quotes: Record<string, unknown>[] }> = {};

  for (const q of quotes) {
    const fid = q.factory_id as string;
    if (!byFactory[fid]) {
      let trust_score: number | null = null;
      try { trust_score = computeTrustScore(fid).score; } catch { /* no score */ }
      byFactory[fid] = {
        factory_id: fid,
        factory_name: (q.factory_name as string) || fid,
        trust_score,
        quotes: [],
      };
    }
    byFactory[fid].quotes.push({
      quote_id: q.quote_id,
      unit_price_usd: q.unit_price_usd,
      total_price_usd: q.total_price_usd,
      lead_time_days: q.lead_time_days,
      moq: q.moq,
      notes: q.notes,
      valid_until: q.valid_until,
      created_at: q.created_at,
    });
  }

  // Sort factories: responded (unit_price > 0) first by price, then pending
  const factories = Object.values(byFactory).sort((a, b) => {
    const aPrice = a.quotes[0]?.unit_price_usd as number ?? 0;
    const bPrice = b.quotes[0]?.unit_price_usd as number ?? 0;
    // Pending (price=0) sorts last
    if (aPrice === 0 && bPrice > 0) return 1;
    if (bPrice === 0 && aPrice > 0) return -1;
    if (aPrice !== bPrice) return aPrice - bPrice;
    return (b.trust_score ?? 0) - (a.trust_score ?? 0);
  });

  return {
    rfq_id: rfq.rfq_id,
    buyer_id: rfq.buyer_id,
    product_description: rfq.product_description,
    quantity: rfq.quantity,
    target_price_usd: rfq.target_price_usd,
    categories: rfq.categories ? JSON.parse(rfq.categories as string) : [],
    max_lead_time_days: rfq.max_lead_time_days,
    status: rfq.status,
    created_at: rfq.created_at,
    factories,
    total_quotes: quotes.length,
    responded: quotes.filter(q => (q.unit_price_usd as number) > 0).length,
  };
}

/** Query live capacity — find all factories that can fulfill right now */
export function queryLiveCapacity(category: string, quantity: number, max_days?: number): InstantQuoteResult[] {
  const db = getDb();
  const rules = db.prepare(`
    SELECT pr.factory_id, pr.category FROM pricing_rules pr
    WHERE pr.category = ? AND pr.capacity_available >= ?
    ORDER BY pr.base_price_usd ASC
  `).all(category, quantity) as Array<{ factory_id: string; category: string }>;

  const results: InstantQuoteResult[] = [];
  for (const r of rules) {
    const q = getInstantQuote(r.factory_id, r.category, quantity);
    if (q && (!max_days || q.lead_time_days <= max_days)) {
      results.push(q);
    }
  }
  return results.sort((a, b) => a.unit_price_usd - b.unit_price_usd);
}
