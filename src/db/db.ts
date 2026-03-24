import { createRequire } from "module";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import type { Database as DatabaseType } from "better-sqlite3";

// better-sqlite3 is CJS — use createRequire for ESM compat
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3") as typeof import("better-sqlite3");

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, "../../data/openfactory.db");
const FACTORIES_JSON = join(__dirname, "../../data/factories.json");

let _db: InstanceType<typeof Database> | null = null;

export function getDb(): InstanceType<typeof Database> {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  seedFactories(_db);
  return _db;
}

function initSchema(db: InstanceType<typeof Database>): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS factories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_zh TEXT,
      city TEXT,
      district TEXT,
      categories TEXT,           -- JSON array
      moq INTEGER,
      lead_time_sample INTEGER,
      lead_time_production INTEGER,
      certifications TEXT,        -- JSON array
      price_tier TEXT,
      capacity_units_per_month INTEGER,
      accepts_foreign_buyers INTEGER DEFAULT 1,
      verified INTEGER DEFAULT 0,
      rating REAL,
      wechat_id TEXT
    );

    CREATE TABLE IF NOT EXISTS quotes (
      quote_id TEXT PRIMARY KEY,
      factory_id TEXT NOT NULL,
      buyer_id TEXT,
      product_description TEXT,
      quantity INTEGER,
      unit_price_usd REAL,
      total_price_usd REAL,
      lead_time_days INTEGER,
      moq INTEGER,
      valid_until TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      factory_id TEXT NOT NULL,
      buyer_id TEXT,
      status TEXT DEFAULT 'pending',
      quantity INTEGER,
      unit_price_usd REAL,
      total_price_usd REAL,
      escrow_held INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      estimated_ship_date TEXT,
      FOREIGN KEY (quote_id) REFERENCES quotes(quote_id),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS factory_applications (
      id TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_zh TEXT,
      city TEXT,
      district TEXT,
      categories TEXT,           -- JSON array
      certifications TEXT,       -- JSON array
      moq INTEGER,
      capacity_units_per_month INTEGER,
      lead_time_sample INTEGER,
      lead_time_production INTEGER,
      price_tier TEXT,
      contact_name TEXT,
      wechat_id TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',  -- pending | approved | rejected
      submitted_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      event TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );
  `);
}

function seedFactories(db: InstanceType<typeof Database>): void {
  const count = (db.prepare("SELECT COUNT(*) as c FROM factories").get() as { c: number }).c;
  if (count > 0) return; // already seeded

  const factories = JSON.parse(readFileSync(FACTORIES_JSON, "utf-8")) as Array<Record<string, unknown>>;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO factories
      (id, name, name_zh, city, district, categories, moq, lead_time_sample,
       lead_time_production, certifications, price_tier, capacity_units_per_month,
       accepts_foreign_buyers, verified, rating, wechat_id)
    VALUES
      (@id, @name, @name_zh, @city, @district, @categories, @moq, @lead_time_sample,
       @lead_time_production, @certifications, @price_tier, @capacity_units_per_month,
       @accepts_foreign_buyers, @verified, @rating, @wechat_id)
  `);

  const seedAll = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const f of rows) {
      const loc = f.location as { city: string; district: string };
      const ltd = f.lead_time_days as { sample: number; production: number };
      insert.run({
        id: f.id,
        name: f.name,
        name_zh: f.name_zh,
        city: loc.city,
        district: loc.district,
        categories: JSON.stringify(f.categories),
        moq: f.moq,
        lead_time_sample: ltd.sample,
        lead_time_production: ltd.production,
        certifications: JSON.stringify(f.certifications),
        price_tier: f.price_tier,
        capacity_units_per_month: f.capacity_units_per_month,
        accepts_foreign_buyers: f.accepts_foreign_buyers ? 1 : 0,
        verified: f.verified ? 1 : 0,
        rating: f.rating ?? null,
        wechat_id: f.wechat_id ?? null,
      });
    }
  });

  seedAll(factories);
  console.log(`🌱 Seeded ${factories.length} factories into SQLite`);
}
