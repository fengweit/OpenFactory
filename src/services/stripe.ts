/**
 * Stripe Escrow Service — Phase 2
 *
 * Architecture:
 *   Buyer pays → PaymentIntent (uncaptured) → factory ships → buyer confirms → capture
 *
 * In dev mode (no STRIPE_SECRET_KEY): simulates the flow with mock IDs.
 * In production: real Stripe API calls with manual capture.
 *
 * Stripe docs: https://stripe.com/docs/payments/place-a-hold-on-a-payment-method
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const DEV_MODE   = !STRIPE_KEY;

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
    return {
      payment_intent_id: mock_id,
      client_secret: `${mock_id}_secret_dev`,
      amount_usd,
      status: "dev_simulated",
      dev_mode: true,
    };
  }

  // Production: create PaymentIntent with manual capture
  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount:          String(Math.round(amount_usd * 100)), // cents
      currency:        "usd",
      capture_method:  "manual",                             // hold, don't charge yet
      description:     `OpenFactory escrow — order ${order_id}`,
      metadata:        JSON.stringify({ order_id }),
    }),
  });

  if (!res.ok) throw new Error(`Stripe error: ${await res.text()}`);
  const pi = await res.json() as { id: string; client_secret: string; status: string };

  return {
    payment_intent_id: pi.id,
    client_secret:     pi.client_secret,
    amount_usd,
    status:            "requires_capture",
    dev_mode:          false,
  };
}

/** Release escrow to factory — capture the PaymentIntent */
export async function releaseEscrow(payment_intent_id: string): Promise<{ captured: boolean }> {
  if (DEV_MODE || payment_intent_id.startsWith("pi_dev_")) {
    console.log(`[Stripe DEV] Escrow released: ${payment_intent_id}`);
    return { captured: true };
  }

  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });

  if (!res.ok) throw new Error(`Stripe capture error: ${await res.text()}`);
  return { captured: true };
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

/** Handle Stripe webhook events */
export function handleWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): string {
  switch (event.type) {
    case "payment_intent.amount_capturable_updated":
      console.log(`[Stripe] Payment authorized — ${event.data.object.id}`);
      return "authorized";
    case "payment_intent.succeeded":
      console.log(`[Stripe] Payment captured — ${event.data.object.id}`);
      return "captured";
    case "payment_intent.canceled":
      console.log(`[Stripe] Payment canceled — ${event.data.object.id}`);
      return "canceled";
    default:
      return "ignored";
  }
}
