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
  migrateFactoriesIdentity(_db);
  seedFactories(_db);
  seedPricingRules(_db);
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
      wechat_id TEXT,
      wechat_webhook_url TEXT,
      uscc TEXT,
      legal_rep TEXT,
      business_license_expiry TEXT,
      trust_score REAL
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
      escrow_status TEXT DEFAULT 'pending_deposit' CHECK(escrow_status IN (
        'pending_deposit','deposit_held','production_released','qc_released',
        'final_released','disputed','refunded'
      )),
      created_at TEXT DEFAULT (datetime('now')),
      estimated_ship_date TEXT,
      FOREIGN KEY (quote_id) REFERENCES quotes(quote_id),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS escrow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      trigger TEXT NOT NULL CHECK(trigger IN ('manual','milestone','system')),
      amount_usd REAL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
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
      photo_urls TEXT,                -- JSON array of photo URLs
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE TABLE IF NOT EXISTS order_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      milestone TEXT NOT NULL CHECK(milestone IN (
        'material_received','production_started','qc_in_progress',
        'qc_pass','qc_fail','ready_for_shipment','shipped'
      )),
      photo_urls TEXT,                -- JSON array
      note TEXT,
      reported_by TEXT,               -- user_id
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE TABLE IF NOT EXISTS qc_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      factory_id TEXT NOT NULL,
      buyer_id TEXT,
      provider TEXT NOT NULL CHECK(provider IN ('qima','sgs','bureau_veritas','manual')),
      inspection_type TEXT NOT NULL DEFAULT 'pre_shipment' CHECK(inspection_type IN ('during_production','pre_shipment','container_loading')),
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','scheduled','completed','failed')),
      report_url TEXT,
      pass INTEGER,
      requested_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY,
      factory_id TEXT NOT NULL REFERENCES factories(id),
      category TEXT NOT NULL,
      base_price_usd REAL NOT NULL,
      moq_break_1_qty INTEGER,
      moq_break_1_price REAL,
      moq_break_2_qty INTEGER,
      moq_break_2_price REAL,
      lead_time_standard INTEGER NOT NULL,
      lead_time_express INTEGER,
      express_premium_pct REAL DEFAULT 0.30,
      capacity_per_month INTEGER NOT NULL,
      capacity_available INTEGER NOT NULL,
      valid_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(factory_id, category)
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      raised_by TEXT NOT NULL CHECK(raised_by IN ('buyer', 'factory', 'platform')),
      reason TEXT NOT NULL,
      evidence_urls TEXT,              -- JSON array of URLs
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'under_review', 'resolved')),
      resolution TEXT CHECK(resolution IN ('refund_full', 'refund_partial', 'rejected', NULL)),
      resolution_notes TEXT,
      raised_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE TABLE IF NOT EXISTS rfqs (
      rfq_id TEXT PRIMARY KEY,
      buyer_id TEXT,
      product_description TEXT,
      quantity INTEGER,
      target_price_usd REAL,
      categories TEXT,                 -- JSON array
      max_lead_time_days INTEGER,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS milestone_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestone_id INTEGER NOT NULL,
      order_id TEXT NOT NULL,
      factory_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      uploaded_at TEXT DEFAULT (datetime('now')),
      file_size_bytes INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (milestone_id) REFERENCES order_milestones(id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS factory_auth (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factory_id TEXT NOT NULL,
      wechat_openid TEXT UNIQUE,
      phone TEXT UNIQUE,
      auth_method TEXT NOT NULL CHECK(auth_method IN ('wechat','phone')),
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );

    CREATE TABLE IF NOT EXISTS phone_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS factory_delivery_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      factory_id TEXT NOT NULL,
      order_id TEXT NOT NULL UNIQUE,
      promised_days INTEGER NOT NULL,
      actual_days INTEGER NOT NULL,
      on_time INTEGER NOT NULL,            -- boolean: actual <= promised
      scored_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (factory_id) REFERENCES factories(id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      partner_name TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '[]',  -- JSON array of allowed endpoints
      rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      factory_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      quality_rating INTEGER NOT NULL CHECK(quality_rating BETWEEN 1 AND 5),
      communication_rating INTEGER NOT NULL CHECK(communication_rating BETWEEN 1 AND 5),
      accuracy_rating INTEGER NOT NULL CHECK(accuracy_rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (factory_id) REFERENCES factories(id)
    );
  `);
}

function migrateFactoriesIdentity(db: InstanceType<typeof Database>): void {
  const cols = db.prepare("PRAGMA table_info(factories)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has("uscc")) db.exec("ALTER TABLE factories ADD COLUMN uscc TEXT");
  if (!colNames.has("legal_rep")) db.exec("ALTER TABLE factories ADD COLUMN legal_rep TEXT");
  if (!colNames.has("business_license_expiry")) db.exec("ALTER TABLE factories ADD COLUMN business_license_expiry TEXT");
  if (!colNames.has("trust_score")) db.exec("ALTER TABLE factories ADD COLUMN trust_score REAL");

  // Migrate factory_applications table: add identity fields if missing
  const appCols = db.prepare("PRAGMA table_info(factory_applications)").all() as Array<{ name: string }>;
  const appColNames = new Set(appCols.map(c => c.name));
  if (!appColNames.has("uscc")) db.exec("ALTER TABLE factory_applications ADD COLUMN uscc TEXT");
  if (!appColNames.has("legal_rep")) db.exec("ALTER TABLE factory_applications ADD COLUMN legal_rep TEXT");
  if (!appColNames.has("business_license_expiry")) db.exec("ALTER TABLE factory_applications ADD COLUMN business_license_expiry TEXT");

  // Migrate orders table: add escrow_status, escrow_released_at, escrow_release_history if missing
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  const orderColNames = new Set(orderCols.map(c => c.name));
  if (!orderColNames.has("escrow_status")) {
    db.exec("ALTER TABLE orders ADD COLUMN escrow_status TEXT DEFAULT 'pending_deposit'");
  }
  if (!orderColNames.has("escrow_released_at")) {
    db.exec("ALTER TABLE orders ADD COLUMN escrow_released_at TEXT");
  }
  if (!orderColNames.has("escrow_release_history")) {
    db.exec("ALTER TABLE orders ADD COLUMN escrow_release_history TEXT DEFAULT '[]'");
  }

  // Migrate orders table: fix CHECK constraint on escrow_status to include 'qc_released'
  // SQLite CHECK constraints added via ALTER TABLE are not enforced, but tables created
  // before 'qc_released' was added will have an old constraint. Recreate the table if needed.
  const orderSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get() as { sql: string } | undefined)?.sql ?? "";
  if (orderSql && !orderSql.includes("qc_released")) {
    db.pragma("foreign_keys = OFF");
    db.exec("DROP TABLE IF EXISTS orders_new");
    db.exec(`
      CREATE TABLE orders_new (
        order_id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL,
        factory_id TEXT NOT NULL,
        buyer_id TEXT,
        status TEXT DEFAULT 'pending',
        quantity INTEGER,
        unit_price_usd REAL,
        total_price_usd REAL,
        escrow_held INTEGER DEFAULT 1,
        escrow_status TEXT DEFAULT 'pending_deposit' CHECK(escrow_status IN (
          'pending_deposit','deposit_held','production_released','qc_released',
          'final_released','disputed','refunded'
        )),
        created_at TEXT DEFAULT (datetime('now')),
        estimated_ship_date TEXT,
        escrow_released_at TEXT,
        escrow_release_history TEXT DEFAULT '[]',
        FOREIGN KEY (quote_id) REFERENCES quotes(quote_id),
        FOREIGN KEY (factory_id) REFERENCES factories(id)
      );
      INSERT INTO orders_new SELECT order_id, quote_id, factory_id, buyer_id, status, quantity,
        unit_price_usd, total_price_usd, escrow_held, escrow_status, created_at, estimated_ship_date,
        escrow_released_at, escrow_release_history FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;
    `);
    db.pragma("foreign_keys = ON");
  }

  // Migrate orders table: add stale_alert_sent column if missing
  if (!orderColNames.has("stale_alert_sent")) {
    db.exec("ALTER TABLE orders ADD COLUMN stale_alert_sent INTEGER DEFAULT 0");
  }

  // Migrate orders table: add Stripe Connect escrow columns
  // Re-read columns in case table was rebuilt above
  const orderCols2 = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  const orderColNames2 = new Set(orderCols2.map(c => c.name));
  if (!orderColNames2.has("payment_intent_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_intent_id TEXT");
  }
  if (!orderColNames2.has("escrow_provider")) {
    db.exec("ALTER TABLE orders ADD COLUMN escrow_provider TEXT DEFAULT 'stripe'");
  }

  // Migrate users table: add wechat_id column if missing
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (userCols.length > 0) {
    const userColNames = new Set(userCols.map(c => c.name));
    if (!userColNames.has("wechat_id")) db.exec("ALTER TABLE users ADD COLUMN wechat_id TEXT");
  }

  // Migrate quotes table: add rfq_id column if missing
  const quoteCols = db.prepare("PRAGMA table_info(quotes)").all() as Array<{ name: string }>;
  const quoteColNames = new Set(quoteCols.map(c => c.name));
  if (!quoteColNames.has("rfq_id")) db.exec("ALTER TABLE quotes ADD COLUMN rfq_id TEXT REFERENCES rfqs(rfq_id)");

  // Migrate qc_requests table: if old schema (has milestone_trigger or inspector_notes), drop and recreate
  const qcCols = db.prepare("PRAGMA table_info(qc_requests)").all() as Array<{ name: string }>;
  const qcColNames = new Set(qcCols.map(c => c.name));
  if (qcCols.length > 0 && (qcColNames.has("milestone_trigger") || qcColNames.has("inspector_notes") || !qcColNames.has("inspection_type") || !qcColNames.has("pass"))) {
    db.exec("DROP TABLE qc_requests");
    db.exec(`
      CREATE TABLE qc_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        factory_id TEXT NOT NULL,
        buyer_id TEXT,
        provider TEXT NOT NULL CHECK(provider IN ('qima','sgs','bureau_veritas','manual')),
        inspection_type TEXT NOT NULL DEFAULT 'pre_shipment' CHECK(inspection_type IN ('during_production','pre_shipment','container_loading')),
        status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','scheduled','completed','failed')),
        report_url TEXT,
        pass INTEGER,
        requested_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (factory_id) REFERENCES factories(id)
      )
    `);
  }
}

function seedFactories(db: InstanceType<typeof Database>): void {
  const count = (db.prepare("SELECT COUNT(*) as c FROM factories").get() as { c: number }).c;
  if (count > 0) return; // already seeded

  const factories = JSON.parse(readFileSync(FACTORIES_JSON, "utf-8")) as Array<Record<string, unknown>>;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO factories
      (id, name, name_zh, city, district, categories, moq, lead_time_sample,
       lead_time_production, certifications, price_tier, capacity_units_per_month,
       accepts_foreign_buyers, verified, rating, wechat_id, wechat_webhook_url,
       uscc, legal_rep, business_license_expiry)
    VALUES
      (@id, @name, @name_zh, @city, @district, @categories, @moq, @lead_time_sample,
       @lead_time_production, @certifications, @price_tier, @capacity_units_per_month,
       @accepts_foreign_buyers, @verified, @rating, @wechat_id, @wechat_webhook_url,
       @uscc, @legal_rep, @business_license_expiry)
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
        wechat_webhook_url: f.wechat_webhook_url ?? null,
        uscc: f.uscc ?? null,
        legal_rep: f.legal_rep ?? null,
        business_license_expiry: f.business_license_expiry ?? null,
      });
    }
  });

  seedAll(factories);
  console.log(`🌱 Seeded ${factories.length} factories into SQLite`);
}

function seedPricingRules(db: InstanceType<typeof Database>): void {
  const count = (db.prepare("SELECT COUNT(*) as c FROM pricing_rules").get() as { c: number }).c;
  if (count > 0) return; // already seeded

  const insert = db.prepare(`
    INSERT OR IGNORE INTO pricing_rules
      (id, factory_id, category, base_price_usd, moq_break_1_qty, moq_break_1_price,
       moq_break_2_qty, moq_break_2_price, lead_time_standard, lead_time_express,
       express_premium_pct, capacity_per_month, capacity_available)
    VALUES
      (@id, @factory_id, @category, @base_price_usd, @moq_break_1_qty, @moq_break_1_price,
       @moq_break_2_qty, @moq_break_2_price, @lead_time_standard, @lead_time_express,
       @express_premium_pct, @capacity_per_month, @capacity_available)
  `);

  const rules = [
    { id: "pr-001", factory_id: "sz-006", category: "pcb_assembly",         base_price_usd: 4.8,  moq_break_1_qty: 2000, moq_break_1_price: 4.2, moq_break_2_qty: 10000, moq_break_2_price: 3.8, lead_time_standard: 21, lead_time_express: 10, express_premium_pct: 0.35, capacity_per_month: 50000, capacity_available: 35000 },
    { id: "pr-002", factory_id: "sz-006", category: "electronics_accessories",base_price_usd: 2.5,  moq_break_1_qty: 5000, moq_break_1_price: 2.1, moq_break_2_qty: 20000, moq_break_2_price: 1.8, lead_time_standard: 18, lead_time_express: 8,  express_premium_pct: 0.30, capacity_per_month: 80000, capacity_available: 60000 },
    { id: "pr-003", factory_id: "sz-001", category: "electronics_accessories",base_price_usd: 3.2,  moq_break_1_qty: 3000, moq_break_1_price: 2.8, moq_break_2_qty: 15000, moq_break_2_price: 2.4, lead_time_standard: 25, lead_time_express: 12, express_premium_pct: 0.30, capacity_per_month: 60000, capacity_available: 40000 },
    { id: "pr-004", factory_id: "sz-005", category: "electronics_accessories",base_price_usd: 2.8,  moq_break_1_qty: 4000, moq_break_1_price: 2.3, moq_break_2_qty: 20000, moq_break_2_price: 1.9, lead_time_standard: 20, lead_time_express: 9,  express_premium_pct: 0.28, capacity_per_month: 70000, capacity_available: 50000 },
    { id: "pr-005", factory_id: "sz-003", category: "metal_enclosure",       base_price_usd: 8.5,  moq_break_1_qty: 500,  moq_break_1_price: 7.2, moq_break_2_qty: 2000,  moq_break_2_price: 6.1, lead_time_standard: 30, lead_time_express: 14, express_premium_pct: 0.40, capacity_per_month: 10000, capacity_available: 7000 },
    { id: "pr-006", factory_id: "zh-001", category: "pcb_assembly",         base_price_usd: 5.2,  moq_break_1_qty: 1000, moq_break_1_price: 4.5, moq_break_2_qty: 5000,  moq_break_2_price: 4.1, lead_time_standard: 18, lead_time_express: 8,  express_premium_pct: 0.35, capacity_per_month: 30000, capacity_available: 12000 },
  ];

  const seedAll = db.transaction((rows: typeof rules) => {
    for (const row of rows) insert.run(row);
  });
  seedAll(rules);
  console.log(`🌱 Seeded ${rules.length} pricing rules into SQLite`);
}
