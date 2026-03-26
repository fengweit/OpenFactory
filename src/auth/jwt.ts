import { createRequire } from "module";
import { getDb } from "../db/db.js";
import { randomUUID, randomBytes, createHash } from "crypto";

const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
const bcrypt = require("bcryptjs") as typeof import("bcryptjs");

export const JWT_SECRET = process.env.JWT_SECRET || "openfactory-dev-secret-change-in-prod";
export const JWT_EXPIRES = "7d";

// ─── schema ─────────────────────────────────────────────────────────────────

export function initAuthSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'buyer',   -- buyer | factory | admin
      factory_id TEXT,             -- set if role=factory
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── register ────────────────────────────────────────────────────────────────

export async function registerUser(params: {
  email: string;
  password: string;
  role?: "buyer" | "factory";
  factory_id?: string;
}): Promise<{ user_id: string; token: string }> {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(params.email);
  if (existing) throw new Error("Email already registered");

  const hash = await bcrypt.hash(params.password, 10);
  const user_id = `usr-${randomUUID().slice(0, 8)}`;

  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, factory_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(user_id, params.email, hash, params.role ?? "buyer", params.factory_id ?? null);

  const token = jwt.sign(
    { user_id, email: params.email, role: params.role ?? "buyer", factory_id: params.factory_id ?? null },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { user_id, token };
}

// ─── login ───────────────────────────────────────────────────────────────────

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<{ user_id: string; role: string; token: string }> {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(params.email) as Record<string, unknown> | undefined;
  if (!user) throw new Error("Invalid email or password");

  const valid = await bcrypt.compare(params.password, user.password_hash as string);
  if (!valid) throw new Error("Invalid email or password");

  const token = jwt.sign(
    { user_id: user.id, email: user.email, role: user.role, factory_id: user.factory_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { user_id: user.id as string, role: user.role as string, token };
}

// ─── verify ───────────────────────────────────────────────────────────────────

export function verifyToken(token: string): {
  user_id: string;
  email: string;
  role: string;
  factory_id: string | null;
} {
  return jwt.verify(token, JWT_SECRET) as ReturnType<typeof verifyToken>;
}

// ─── Fastify preHandler ───────────────────────────────────────────────────────

import type { FastifyRequest, FastifyReply } from "fastify";

export function requireAuth(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid Authorization header" });
    return;
  }
  try {
    const payload = verifyToken(auth.slice(7));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as unknown as Record<string, unknown>).user = payload;
    done();
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}

// ─── API Key auth for AI agent partners ──────────────────────────────────────

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// In-memory sliding window rate limiter for API keys
const apiKeyHits: Map<string, number[]> = new Map();

function checkRateLimit(keyId: string, limitPerMin: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const hits = apiKeyHits.get(keyId) ?? [];
  const recent = hits.filter(t => now - t < windowMs);
  if (recent.length >= limitPerMin) {
    apiKeyHits.set(keyId, recent);
    return false;
  }
  recent.push(now);
  apiKeyHits.set(keyId, recent);
  return true;
}

export function generateApiKey(partnerName: string, permissions: string[], rateLimitPerMin = 60): {
  id: string;
  key: string;
  partner_name: string;
  permissions: string[];
  rate_limit_per_min: number;
} {
  const db = getDb();
  const id = `apk-${randomUUID().slice(0, 8)}`;
  const raw = randomBytes(32).toString("hex");
  const key = `ofk_${raw}`;
  const keyHash = hashApiKey(key);

  db.prepare(`
    INSERT INTO api_keys (id, key_hash, partner_name, permissions, rate_limit_per_min)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, keyHash, partnerName, JSON.stringify(permissions), rateLimitPerMin);

  return { id, key, partner_name: partnerName, permissions, rate_limit_per_min: rateLimitPerMin };
}

export function requireApiKey(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ofk_")) {
    reply.status(401).send({ error: "Missing or invalid API key. Expected: Authorization: Bearer ofk_..." });
    return;
  }

  const key = auth.slice(7); // strip "Bearer "
  const keyHash = hashApiKey(key);
  const db = getDb();

  const row = db.prepare(
    "SELECT id, partner_name, permissions, rate_limit_per_min FROM api_keys WHERE key_hash = ?"
  ).get(keyHash) as { id: string; partner_name: string; permissions: string; rate_limit_per_min: number } | undefined;

  if (!row) {
    reply.status(401).send({ error: "Invalid API key" });
    return;
  }

  // Enforce rate limit
  if (!checkRateLimit(row.id, row.rate_limit_per_min)) {
    reply.status(429).send({ error: `Rate limit exceeded: ${row.rate_limit_per_min} requests/min` });
    return;
  }

  // Check endpoint permission
  const permissions = JSON.parse(row.permissions) as string[];
  if (permissions.length > 0) {
    const method = req.method.toUpperCase();
    const url = req.url.split("?")[0]; // strip query string
    const endpoint = `${method} ${url}`;
    const allowed = permissions.some(p => {
      // Support wildcard patterns like "GET /factories*"
      if (p.endsWith("*")) return endpoint.startsWith(p.slice(0, -1));
      // Support patterns with :param like "GET /orders/:id"
      const regex = new RegExp("^" + p.replace(/:[^/]+/g, "[^/]+") + "$");
      return regex.test(endpoint);
    });
    if (!allowed) {
      reply.status(403).send({ error: "API key does not have permission for this endpoint" });
      return;
    }
  }

  // Update last_used_at
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);

  // Attach partner info to request (similar to user payload)
  (req as unknown as Record<string, unknown>).user = {
    user_id: row.id,
    email: `${row.partner_name}@api-key`,
    role: "api_key",
    factory_id: null,
    partner_name: row.partner_name,
  };

  done();
}

/** Middleware that accepts EITHER a JWT token OR an API key */
export function requireAuthOrApiKey(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ofk_")) {
    return requireApiKey(req, reply, done);
  }
  return requireAuth(req, reply, done);
}
