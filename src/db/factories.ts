import { readFileSync } from "fs";
import { join } from "path";
import { Factory } from "../schemas/factory.js";
import { QuoteRequest, QuoteResponse } from "../schemas/quote.js";
import { Order } from "../schemas/order.js";
import { randomUUID } from "crypto";

const factoriesRaw = JSON.parse(
  readFileSync(join(process.cwd(), "data/factories.json"), "utf-8")
) as Factory[];

// In-memory stores for POC
const quotes = new Map<string, QuoteResponse>();
const orders = new Map<string, Order>();

export function searchFactories(params: {
  category?: string;
  max_moq?: number;
  price_tier?: string;
  min_rating?: number;
  verified_only?: boolean;
}): Factory[] {
  return factoriesRaw.filter((f) => {
    if (params.category && !f.categories.includes(params.category as Factory["categories"][number])) return false;
    if (params.max_moq !== undefined && f.moq > params.max_moq) return false;
    if (params.price_tier && f.price_tier !== params.price_tier) return false;
    if (params.min_rating !== undefined && (f.rating ?? 0) < params.min_rating) return false;
    if (params.verified_only && !f.verified) return false;
    return true;
  });
}

export function getQuote(req: QuoteRequest): QuoteResponse {
  const factory = factoriesRaw.find((f) => f.id === req.factory_id);
  if (!factory) throw new Error(`Factory ${req.factory_id} not found`);

  const basePriceByTier: Record<string, number> = {
    budget: 1.2,
    mid: 2.8,
    premium: 6.5,
  };

  const unitPrice = basePriceByTier[factory.price_tier] ?? 2.0;
  const volumeDiscount =
    req.quantity >= 1000 ? 0.85 : req.quantity >= 500 ? 0.92 : 1.0;
  const finalUnitPrice = parseFloat((unitPrice * volumeDiscount).toFixed(2));

  const quote: QuoteResponse = {
    quote_id: `q-${randomUUID().slice(0, 8)}`,
    factory_id: req.factory_id,
    unit_price_usd: finalUnitPrice,
    total_price_usd: parseFloat((finalUnitPrice * req.quantity).toFixed(2)),
    lead_time_days: factory.lead_time_days.production,
    moq: factory.moq,
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: `Quote for ${req.quantity}x ${req.product_description} from ${factory.name}`,
  };

  quotes.set(quote.quote_id, quote);
  return quote;
}

export function placeOrder(params: {
  quote_id: string;
  buyer_id: string;
}): Order {
  const quote = quotes.get(params.quote_id);
  if (!quote) throw new Error(`Quote ${params.quote_id} not found or expired`);

  const quantity = Math.round(quote.total_price_usd / quote.unit_price_usd);

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
    estimated_ship_date: new Date(
      Date.now() + quote.lead_time_days * 24 * 60 * 60 * 1000
    ).toISOString(),
  };

  orders.set(order.order_id, order);
  return order;
}

export function trackOrder(order_id: string): Order {
  const order = orders.get(order_id);
  if (!order) throw new Error(`Order ${order_id} not found`);
  return order;
}

export function getAllFactories(): Factory[] {
  return factoriesRaw;
}
