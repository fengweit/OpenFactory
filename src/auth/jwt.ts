import { createRequire } from "module";
import { getDb } from "../db/db.js";
import { randomUUID } from "crypto";

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
    (req as Record<string, unknown>).user = payload;
    done();
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}
