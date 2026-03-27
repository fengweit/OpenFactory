/**
 * Stripe Escrow Service — Phase 2 (Real Integration)
 *
 * Architecture:
 *   Buyer pays → PaymentIntent (uncaptured, capture_method: 'manual')
 *   → milestone gates release partial captures (30/40/30)
 *   → webhook confirms state updates
 *
 * In dev mode (no STRIPE_SECRET_KEY): simulates the flow with mock IDs.
 * In production: real Stripe API calls with manual capture.
 *
 * Stripe docs: https://stripe.com/docs/payments/place-a-hold-on-a-payment-method
 */

import { getDb } from "../db/db.js";

const STRIPE_KEY            = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const DEV_MODE              = !STRIPE_KEY;

export interface EscrowResult {
  payment_intent_id: string;
  client_secret:     string | null;
  amount_usd:        number;
  status:            "requires_capture" | "succeeded" | "canceled" | "dev_simulated";
  dev_mode:          boolean;
}

/** Create an uncaptured PaymentIntent — funds held, not charged yet */
export async function createEscrow(amount_usd: number, order_id: string): Promise<EscrowResult> {
  if (DEV_MODE) {
    const mock_id = `pi_dev_${order_id.replace("ord-", "").slice(0, 8)}`;
    console.log(`[Stripe DEV] Created escrow for ${order_id}: ${mock_id} — $${amount_usd}`);
    // Store mock payment_intent_id in orders table
    try {
      const db = getDb();
      db.prepare("UPDATE orders SET payment_intent_id = ?, escrow_provider = 'stripe' WHERE order_id = ?")
        .run(mock_id, order_id);
    } catch { /* non-fatal in dev */ }
    return {
      payment_intent_id: mock_id,
      client_secret: `${mock_id}_secret_dev`,
      amount_usd,
      status: "dev_simulated",
      dev_mode: true,
    };
  }

  // Production: create PaymentIntent with manual capture
  const params = new URLSearchParams();
  params.set("amount", String(Math.round(amount_usd * 100))); // cents
  params.set("currency", "usd");
  params.set("capture_method", "manual"); // hold, don't charge yet
  params.set("description", `OpenFactory escrow — order ${order_id}`);
  params.set("metadata[order_id]", order_id);

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`);
  const pi = await res.json() as { id: string; client_secret: string; status: string };

  // Store payment_intent_id in orders table
  const db = getDb();
  db.prepare("UPDATE orders SET payment_intent_id = ?, escrow_provider = 'stripe' WHERE order_id = ?")
    .run(pi.id, order_id);

  return {
    payment_intent_id: pi.id,
    client_secret:     pi.client_secret,
    amount_usd,
    status:            "requires_capture",
    dev_mode:          false,
  };
}

/**
 * Release escrow to factory — capture the PaymentIntent (partial or full).
 * amount_to_capture_usd: if provided, captures only this amount (milestone-based partial capture).
 * Stripe allows partial capture on manual-capture PaymentIntents.
 */
export async function releaseEscrow(
  payment_intent_id: string,
  amount_to_capture_usd?: number,
): Promise<{ captured: boolean; amount_captured_usd: number | null }> {
  if (DEV_MODE || payment_intent_id.startsWith("pi_dev_")) {
    console.log(`[Stripe DEV] Escrow released: ${payment_intent_id}${amount_to_capture_usd ? ` — $${amount_to_capture_usd.toFixed(2)}` : " (full)"}`);
    return { captured: true, amount_captured_usd: amount_to_capture_usd ?? null };
  }

  const params = new URLSearchParams();
  if (amount_to_capture_usd !== undefined) {
    params.set("amount_to_capture", String(Math.round(amount_to_capture_usd * 100)));
  }

  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!res.ok) throw new Error(`Stripe capture error: ${await res.text()}`);
  return { captured: true, amount_captured_usd: amount_to_capture_usd ?? null };
}

/** Cancel escrow (dispute or cancellation) — void the PaymentIntent */
export async function cancelEscrow(payment_intent_id: string): Promise<{ canceled: boolean }> {
  if (DEV_MODE || payment_intent_id.startsWith("pi_dev_")) {
    console.log(`[Stripe DEV] Escrow canceled: ${payment_intent_id}`);
    return { canceled: true };
  }

  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });

  if (!res.ok) throw new Error(`Stripe cancel error: ${await res.text()}`);
  return { canceled: true };
}

/**
 * Verify Stripe webhook signature.
 * Returns the parsed event if valid, or null if verification fails.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  if (!STRIPE_WEBHOOK_SECRET) return true; // skip verification in dev
  // Stripe signature format: t=<timestamp>,v1=<sig>
  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split("=");
    acc[key] = val;
    return acc;
  }, {});

  if (!parts.t || !parts.v1) return false;

  // Use Node.js crypto for HMAC verification
  const { createHmac } = await_crypto();
  const payload = `${parts.t}.${rawBody}`;
  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(payload).digest("hex");
  return expected === parts.v1;
}

/** Lazy crypto import (avoid top-level await) */
function await_crypto() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("crypto") as typeof import("crypto");
}
// Node built-in — always available
const require = (await import("module")).createRequire(import.meta.url);

/** Handle Stripe webhook events — updates DB escrow_status and escrow_events */
export function handleWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): string {
  const pi = event.data.object;
  const pi_id = pi.id as string | undefined;
  const metadata = pi.metadata as Record<string, string> | undefined;
  const order_id = metadata?.order_id;

  switch (event.type) {
    case "payment_intent.amount_capturable_updated": {
      console.log(`[Stripe] Payment authorized — ${pi_id}`);
      if (order_id) {
        updateEscrowFromWebhook(order_id, pi_id!, "deposit_held", "Stripe payment authorized — funds held");
      }
      return "authorized";
    }
    case "payment_intent.succeeded": {
      console.log(`[Stripe] Payment captured — ${pi_id}`);
      if (order_id) {
        // Payment fully captured — record the event (status already managed by milestone flow)
        recordEscrowWebhookEvent(order_id, "payment_intent.succeeded", `Stripe capture confirmed for ${pi_id}`);
      }
      return "captured";
    }
    case "payment_intent.canceled": {
      console.log(`[Stripe] Payment canceled — ${pi_id}`);
      if (order_id) {
        updateEscrowFromWebhook(order_id, pi_id!, "refunded", "Stripe payment canceled — funds released to buyer");
      }
      return "canceled";
    }
    default:
      return "ignored";
  }
}

/** Update escrow_status from a Stripe webhook and log the event */
function updateEscrowFromWebhook(order_id: string, payment_intent_id: string, to_status: string, note: string): void {
  try {
    const db = getDb();
    const order = db.prepare("SELECT escrow_status FROM orders WHERE order_id = ?")
      .get(order_id) as { escrow_status: string } | undefined;
    if (!order) return;

    const from_status = order.escrow_status;
    db.prepare("UPDATE orders SET escrow_status = ? WHERE order_id = ?")
      .run(to_status, order_id);
    db.prepare(`
      INSERT INTO escrow_events (order_id, from_status, to_status, trigger, note)
      VALUES (?, ?, ?, 'system', ?)
    `).run(order_id, from_status, to_status, `[stripe:${payment_intent_id}] ${note}`);

    console.log(`[Escrow Webhook] ${order_id}: ${from_status} → ${to_status}`);
  } catch (e) {
    console.error(`[Escrow Webhook] Failed to update ${order_id}:`, e);
  }
}

/** Record a webhook event in escrow_events without changing escrow_status */
function recordEscrowWebhookEvent(order_id: string, event_type: string, note: string): void {
  try {
    const db = getDb();
    const order = db.prepare("SELECT escrow_status FROM orders WHERE order_id = ?")
      .get(order_id) as { escrow_status: string } | undefined;
    if (!order) return;

    db.prepare(`
      INSERT INTO escrow_events (order_id, from_status, to_status, trigger, note)
      VALUES (?, ?, ?, 'system', ?)
    `).run(order_id, order.escrow_status, order.escrow_status, `[stripe:${event_type}] ${note}`);
  } catch (e) {
    console.error(`[Escrow Webhook] Failed to record event for ${order_id}:`, e);
  }
}
