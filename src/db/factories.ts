import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import { Factory } from "../schemas/factory.js";
import { QuoteRequest, QuoteResponse } from "../schemas/quote.js";
import { Order } from "../schemas/order.js";

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
    verified: Boolean(row.verified),
    rating: row.rating as number | undefined,
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
    created_at: row.created_at as string,
    estimated_ship_date: row.estimated_ship_date as string,
  };
}

// ─── search ─────────────────────────────────────────────────────────────────

export function searchFactories(params: {
  category?: string;
  max_moq?: number;
  price_tier?: string;
  min_rating?: number;
  verified_only?: boolean;
}): Factory[] {
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
  if (params.category) {
    return rows
      .map(rowToFactory)
      .filter(f => f.categories.includes(params.category as Factory["categories"][number]));
  }
  return rows.map(rowToFactory);
}

export function getAllFactories(): Factory[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM factories ORDER BY rating DESC").all() as Record<string, unknown>[];
  return rows.map(rowToFactory);
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
    created_at: new Date().toISOString(),
    estimated_ship_date: estimatedShipDate,
  };

  db.prepare(`
    INSERT INTO orders (order_id, quote_id, factory_id, buyer_id, status, quantity,
      unit_price_usd, total_price_usd, escrow_held, created_at, estimated_ship_date)
    VALUES (@order_id, @quote_id, @factory_id, @buyer_id, @status, @quantity,
      @unit_price_usd, @total_price_usd, @escrow_held, @created_at, @estimated_ship_date)
  `).run({ ...order, escrow_held: 1 });

  // Log initial event
  db.prepare("INSERT INTO order_events (order_id, event) VALUES (?, ?)").run(order.order_id, "order_placed");

  return order;
}

// ─── track ──────────────────────────────────────────────────────────────────

export function trackOrder(order_id: string): Order & { events: Array<{ event: string; note: string | null; created_at: string }> } {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE order_id = ?").get(order_id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Order ${order_id} not found`);

  const events = db.prepare(
    "SELECT event, note, created_at FROM order_events WHERE order_id = ? ORDER BY created_at ASC"
  ).all(order_id) as Array<{ event: string; note: string | null; created_at: string }>;

  return { ...rowToOrder(row), events };
}

// ─── update order status ─────────────────────────────────────────────────────

export function updateOrderStatus(order_id: string, status: Order["status"], note?: string): Order {
  const db = getDb();
  db.prepare("UPDATE orders SET status = ? WHERE order_id = ?").run(status, order_id);
  db.prepare("INSERT INTO order_events (order_id, event, note) VALUES (?, ?, ?)").run(order_id, status, note ?? null);
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
       contact_name, wechat_id, email, phone, description)
    VALUES
      (@id, @name_en, @name_zh, @city, @district, @categories, @certifications, @moq,
       @capacity_units_per_month, @lead_time_sample, @lead_time_production, @price_tier,
       @contact_name, @wechat_id, @email, @phone, @description)
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
