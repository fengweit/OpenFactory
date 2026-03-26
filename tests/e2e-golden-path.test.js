/**
 * E2E Golden Path — Full Trust Workflow Integration Test
 *
 * Exercises the complete lifecycle against the real API:
 *   Quote → Accept → Order → Escrow Lock → Milestones (with escrow transitions)
 *   → QC Request → Review → Trust Score
 *
 * Run:  node --test tests/e2e-golden-path.test.js
 * Requires: API server running on localhost:3000 (npm run api)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.API_URL || "http://localhost:3000";

// ─── helpers ────────────────────────────────────────────────────────────────

async function post(path, body = {}, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function patch(path, body = {}, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ─── state shared across steps ──────────────────────────────────────────────

const FACTORY_ID = "sz-001";
const uid = Date.now().toString(36);

let buyerToken;
let factoryToken;
let quoteId;
let orderId;
let buyerId;

// ─── test suite ─────────────────────────────────────────────────────────────

describe("Golden Path E2E — Full Trust Workflow", () => {
  // ── setup: register buyer + factory users ────────────────────────────────

  before(async () => {
    // Verify server is reachable
    const health = await get("/health");
    assert.equal(health.status, 200, "Server not reachable on " + BASE);

    // Register a buyer
    const buyer = await post("/auth/register", {
      email: `buyer-e2e-${uid}@test.com`,
      password: "testpass123",
      role: "buyer",
    });
    assert.ok(buyer.data.token, "Buyer registration failed");
    buyerToken = buyer.data.token;
    buyerId = buyer.data.user_id;

    // Register a factory user linked to sz-001
    const factory = await post("/auth/register", {
      email: `factory-e2e-${uid}@test.com`,
      password: "testpass123",
      role: "factory",
      factory_id: FACTORY_ID,
    });
    assert.ok(factory.data.token, "Factory registration failed");
    factoryToken = factory.data.token;
  });

  // ── step 1: request a quote ──────────────────────────────────────────────

  it("Step 1 — POST /quotes: request a quote from factory", async () => {
    const { status, data } = await post(
      "/quotes",
      {
        factory_id: FACTORY_ID,
        product_description: "E2E golden-path test widgets",
        quantity: 500,
        buyer_id: buyerId,
      },
      authHeader(buyerToken),
    );
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert.ok(data.quote_id, "Missing quote_id");
    assert.ok(data.unit_price_usd > 0, "unit_price_usd should be positive");
    assert.ok(data.total_price_usd > 0, "total_price_usd should be positive");
    quoteId = data.quote_id;
  });

  // ── step 2: factory responds / accepts ───────────────────────────────────

  it("Step 2 — POST /quotes/:id/respond: factory accepts the quote", async () => {
    const { status, data } = await post(`/quotes/${quoteId}/respond`, {
      factory_id: FACTORY_ID,
      unit_price_usd: 3.5,
      lead_time_days: 20,
      notes: "E2E test — volume discount applied",
    });
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.status, "responded");
    assert.equal(data.unit_price_usd, 3.5);
  });

  // ── step 3: place order ──────────────────────────────────────────────────

  it("Step 3 — POST /orders: place order from accepted quote", async () => {
    const { status, data } = await post(
      "/orders",
      { quote_id: quoteId, buyer_id: buyerId },
      authHeader(buyerToken),
    );
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert.ok(data.order_id, "Missing order_id");
    assert.equal(data.escrow_status, "pending_deposit");
    assert.equal(data.factory_id, FACTORY_ID);
    orderId = data.order_id;
  });

  // ── step 4: lock 30 % deposit ────────────────────────────────────────────

  it("Step 4 — POST /orders/:id/escrow/lock: lock 30% deposit", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/escrow/lock`,
      {},
      authHeader(buyerToken),
    );
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.deposit_locked, true);
    assert.equal(data.escrow_status, "deposit_held");
    assert.ok(data.deposit_amount_usd > 0, "deposit_amount_usd should be positive");
    assert.ok(data.escrow_event, "Missing escrow_event");
    assert.equal(data.escrow_event.to_status, "deposit_held");
  });

  // ── step 5: milestones + escrow auto-transitions ─────────────────────────

  it("Step 5a — milestone: material_received", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "material_received", note: "Raw materials received" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "material_received");
    // No escrow transition at this step
    assert.equal(data.escrow_transition, undefined);
  });

  it("Step 5b — milestone: production_started → escrow production_released", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "production_started", note: "Production line running" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "production_started");
    // Escrow auto-transition: deposit_held → production_released
    assert.ok(data.escrow_transition, "Expected escrow auto-transition at production_started");
    assert.equal(data.escrow_transition.from_status, "deposit_held");
    assert.equal(data.escrow_transition.to_status, "production_released");
    assert.equal(data.escrow_transition.trigger, "milestone");
  });

  // ── verify milestone ordering enforcement ─────────────────────────────────

  it("Step 5b-verify — out-of-order milestone returns 400", async () => {
    // Attempt to skip to 'shipped' without qc_in_progress → qc_pass → ready_for_shipment
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "shipped", note: "Trying to skip ahead" },
      authHeader(factoryToken),
    );
    assert.equal(status, 400, `Expected 400 for out-of-order milestone, got ${status}`);
    assert.ok(data.error, "Expected error message for out-of-order milestone");
    assert.match(data.error, /requires one of/i);
  });

  it("Step 5c — milestone: qc_in_progress", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "qc_in_progress", note: "QC inspection underway" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "qc_in_progress");
  });

  // ── step 6: QC request (manual) at qc_in_progress stage ──────────────────

  it("Step 6 — POST /orders/:id/qc-request: request manual QC inspection", async () => {
    const { status, data } = await post(`/orders/${orderId}/qc-request`, {
      provider: "manual",
      inspection_type: "pre_shipment",
      buyer_id: buyerId,
    });
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.provider, "manual");
    assert.equal(data.status, "requested");
    assert.equal(data.order_id, orderId);
  });

  it("Step 5d — milestone: qc_pass → escrow qc_released", async () => {
    // 'manual' provider does NOT block factory self-reporting qc_pass
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "qc_pass", note: "QC passed — all units within spec" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "qc_pass");
    // Escrow auto-transition: production_released → qc_released
    assert.ok(data.escrow_transition, "Expected escrow auto-transition at qc_pass");
    assert.equal(data.escrow_transition.from_status, "production_released");
    assert.equal(data.escrow_transition.to_status, "qc_released");
    assert.equal(data.escrow_transition.trigger, "milestone");
  });

  it("Step 5e — milestone: ready_for_shipment", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "ready_for_shipment", note: "Packaged and palletized" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "ready_for_shipment");
  });

  it("Step 5f — milestone: shipped → escrow final_released", async () => {
    const { status, data } = await post(
      `/orders/${orderId}/milestones`,
      { milestone: "shipped", note: "Shipped via DHL Express" },
      authHeader(factoryToken),
    );
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.milestone, "shipped");
    // Escrow auto-transition: qc_released → final_released
    assert.ok(data.escrow_transition, "Expected escrow auto-transition at shipped");
    assert.equal(data.escrow_transition.from_status, "qc_released");
    assert.equal(data.escrow_transition.to_status, "final_released");
    assert.equal(data.escrow_transition.trigger, "milestone");
  });

  // ── verify full escrow trail ──────────────────────────────────────────────

  it("Verify — escrow events show complete 30-40-30 trail", async () => {
    const { status, data } = await get(
      `/orders/${orderId}/escrow-events`,
    );
    assert.equal(status, 200);
    assert.ok(data.escrow_events.length >= 4, "Expected at least 4 escrow events");
    const statuses = data.escrow_events.map((e) => e.to_status);
    assert.ok(statuses.includes("deposit_held"), "Missing deposit_held event");
    assert.ok(statuses.includes("production_released"), "Missing production_released event");
    assert.ok(statuses.includes("qc_released"), "Missing qc_released event");
    assert.ok(statuses.includes("final_released"), "Missing final_released event");
  });

  // ── transition order to delivered (required for review) ───────────────────

  it("Transition order status to delivered for review", async () => {
    // Step through valid status transitions: pending → confirmed → in_production → qc → shipped → delivered
    const transitions = ["confirmed", "in_production", "qc", "shipped", "delivered"];
    for (const nextStatus of transitions) {
      const { status, data } = await patch(
        `/orders/${orderId}/status`,
        { status: nextStatus, note: `E2E transition to ${nextStatus}` },
        authHeader(factoryToken),
      );
      assert.equal(
        status,
        200,
        `Status transition to '${nextStatus}' failed (${status}): ${JSON.stringify(data)}`,
      );
    }
  });

  // ── step 7: buyer review ─────────────────────────────────────────────────

  it("Step 7 — POST /orders/:id/review: submit buyer review", async () => {
    const { status, data } = await post(`/orders/${orderId}/review`, {
      buyer_id: buyerId,
      rating: 5,
      quality_rating: 5,
      communication_rating: 4,
      accuracy_rating: 5,
      comment: "E2E golden-path — excellent quality, on-time delivery",
    });
    assert.equal(status, 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.rating, 5);
    assert.equal(data.factory_id, FACTORY_ID);
    assert.ok(data.id, "Missing review id");
  });

  // ── step 8: trust score ──────────────────────────────────────────────────

  it("Step 8 — GET /factories/:id/trust-score: verify score computed", async () => {
    const { status, data } = await get(`/factories/${FACTORY_ID}/trust-score`);
    assert.equal(status, 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert.equal(data.factory_id, FACTORY_ID);
    assert.ok(typeof data.score === "number", "score should be a number");
    assert.ok(data.score >= 0 && data.score <= 100, `score ${data.score} out of 0-100 range`);
    assert.ok(data.breakdown, "Missing breakdown object");
    assert.ok(typeof data.breakdown.identity === "number", "Missing identity breakdown");
    assert.ok(typeof data.breakdown.execution === "number", "Missing execution breakdown");
    assert.ok(typeof data.breakdown.transparency === "number", "Missing transparency breakdown");
    assert.ok(typeof data.breakdown.quality === "number", "Missing quality breakdown");
    assert.ok(typeof data.breakdown.reputation === "number", "Missing reputation breakdown");
  });
});
