# OpenFactory API Reference

Base URL: `http://localhost:3000`

Rate limit: 100 requests/min per IP.

---

## Health

### GET /health

API health check.

- **Auth:** None

**Response:**
```json
{
  "service": "OpenFactory API",
  "version": "0.3.0",
  "status": "ok",
  "tools": ["search_factories", "get_quote", "place_order", "track_order", "update_order_status", "get_analytics"],
  "factories": 10,
  "uptime_s": 42
}
```

```bash
curl http://localhost:3000/health
```

---

## Factories

### GET /factories

Search factories by category, MOQ, price tier, and rating.

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by product category (e.g. `electronics_accessories`) |
| `max_moq` | number | Maximum acceptable MOQ |
| `price_tier` | string | `budget` / `mid` / `premium` |
| `min_rating` | number | Minimum rating (0-5) |
| `verified_only` | boolean | Only verified factories |

**Response:**
```json
{
  "factories": [
    {
      "id": "sz-005",
      "name": "Qianhai Global Accessories",
      "name_zh": "前海全球配件有限公司",
      "location": { "city": "Shenzhen", "district": "Qianhai" },
      "categories": ["electronics_accessories", "cable_assembly", "plastic_injection"],
      "moq": 300,
      "lead_time_days": { "sample": 5, "production": 22 },
      "certifications": ["ISO9001", "CE", "RoHS", "FCC"],
      "price_tier": "mid",
      "capacity_units_per_month": 75000,
      "accepts_foreign_buyers": true,
      "verified": true,
      "rating": 4.5
    }
  ],
  "count": 1
}
```

```bash
curl "http://localhost:3000/factories?category=electronics_accessories&verified_only=true"
```

### GET /factories/:id/quotes

Get all quote requests received by a factory.

- **Auth:** None

**Response:**
```json
[
  {
    "quote_id": "q-abc12345",
    "factory_id": "sz-005",
    "product_description": "Custom phone cases",
    "quantity": 1000,
    "unit_price_usd": 2.58,
    "total_price_usd": 2580,
    "lead_time_days": 22,
    "buyer_id": "buyer-001",
    "target_price_usd": 2.50,
    "created_at": "2026-03-25T10:00:00.000Z"
  }
]
```

```bash
curl http://localhost:3000/factories/sz-005/quotes
```

### GET /factories/:id/orders

Get all orders placed with a factory.

- **Auth:** None

**Response:**
```json
[
  {
    "order_id": "ord-abc12345",
    "factory_id": "sz-005",
    "buyer_id": "buyer-001",
    "status": "pending",
    "quantity": 1000,
    "unit_price_usd": 2.58,
    "total_price_usd": 2580,
    "escrow_held": true,
    "created_at": "2026-03-25T10:00:00.000Z",
    "estimated_ship_date": "2026-04-16T10:00:00.000Z"
  }
]
```

```bash
curl http://localhost:3000/factories/sz-005/orders
```

### GET /factories/:id/instant-quote

Get a sub-second binding quote from pre-declared pricing rules.

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Product category (required) |
| `qty` | number | Quantity (required) |

**Response:**
```json
{
  "factory_id": "sz-006",
  "factory_name": "南山物联网方案",
  "category": "pcb_assembly",
  "quantity": 1000,
  "unit_price_usd": 4.20,
  "total_price_usd": 4200,
  "lead_time_days": 18,
  "express_available": true,
  "express_days": 10,
  "express_price_usd": 5460,
  "capacity_available": 8000,
  "confidence": 0.88,
  "valid_hours": 48,
  "pricing_basis": "standard (≥500)"
}
```

```bash
curl "http://localhost:3000/factories/sz-006/instant-quote?category=pcb_assembly&qty=1000"
```

### GET /factories/:id/capacity

Get current declared capacity for a factory.

- **Auth:** None

**Response:**
```json
{
  "factory_id": "sz-006",
  "capacity": [
    {
      "factory_id": "sz-006",
      "category": "pcb_assembly",
      "available_units": 8000,
      "capacity_per_month": 15000,
      "base_price_usd": 5.50,
      "lead_time_standard": 18,
      "lead_time_express": 10,
      "valid_until": null,
      "updated_at": "2026-03-25T10:00:00.000Z"
    }
  ]
}
```

```bash
curl http://localhost:3000/factories/sz-006/capacity
```

### GET /factories/:id/pricing-rules

Get all pricing rules for a factory.

- **Auth:** None

**Response:**
```json
{
  "factory_id": "sz-006",
  "rules": [
    {
      "id": "pr-abc12345",
      "factory_id": "sz-006",
      "category": "pcb_assembly",
      "base_price_usd": 5.50,
      "moq_break_1_qty": 500,
      "moq_break_1_price": 4.20,
      "moq_break_2_qty": 2000,
      "moq_break_2_price": 3.80,
      "lead_time_standard": 18,
      "lead_time_express": 10,
      "express_premium_pct": 0.30,
      "capacity_per_month": 15000,
      "capacity_available": 8000,
      "valid_until": null
    }
  ]
}
```

```bash
curl http://localhost:3000/factories/sz-006/pricing-rules
```

### PATCH /factories/:id/capacity

Update declared capacity for a factory/category.

- **Auth:** None

**Request body:**
```json
{
  "category": "pcb_assembly",
  "available_units": 5000,
  "available_from": "2026-04-01",
  "price_override_usd": 4.80
}
```

**Response:** Updated `FactoryCapacity` object.

```bash
curl -X PATCH http://localhost:3000/factories/sz-006/capacity \
  -H "Content-Type: application/json" \
  -d '{"category":"pcb_assembly","available_units":5000}'
```

### PATCH /factories/:id/pricing-rules

Upsert pricing rules for a factory. Accepts an array of rules.

- **Auth:** None

**Request body:**
```json
[
  {
    "category": "pcb_assembly",
    "unit_price_usd": 4.50,
    "min_qty": 500,
    "max_qty": 10000,
    "lead_time_days": 20
  }
]
```

**Response:**
```json
{
  "factory_id": "sz-006",
  "rules": [ /* ...updated PricingRule objects */ ]
}
```

```bash
curl -X PATCH http://localhost:3000/factories/sz-006/pricing-rules \
  -H "Content-Type: application/json" \
  -d '[{"category":"pcb_assembly","unit_price_usd":4.50,"min_qty":500}]'
```

---

## Capacity

### GET /capacity

Live capacity query across all factories.

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Product category (required) |
| `qty` | number | Required units (required) |
| `max_days` | number | Maximum lead time in days (optional) |

**Response:**
```json
{
  "query": { "category": "pcb_assembly", "quantity": 1000, "max_days": null },
  "count": 3,
  "results": [
    {
      "factory_id": "sz-004",
      "factory_name": "...",
      "unit_price_usd": 3.50,
      "total_price_usd": 3500,
      "lead_time_days": 20,
      "capacity_available": 6000,
      "confidence": 0.82
    }
  ],
  "computed_in_ms": 0
}
```

```bash
curl "http://localhost:3000/capacity?category=pcb_assembly&qty=1000&max_days=25"
```

---

## Quotes

### POST /quotes

Request a price quote from a factory. Triggers a WeChat notification.

- **Auth:** None

**Request body:**
```json
{
  "factory_id": "sz-005",
  "product_description": "Custom branded phone cases",
  "quantity": 1000,
  "buyer_id": "buyer-001",
  "target_price_usd": 2.50,
  "deadline_days": 45
}
```

**Response:**
```json
{
  "quote_id": "q-abc12345",
  "factory_id": "sz-005",
  "unit_price_usd": 2.58,
  "total_price_usd": 2580,
  "lead_time_days": 22,
  "moq": 300,
  "valid_until": "2026-04-01T10:00:00.000Z",
  "notes": "Quote for 1000x Custom branded phone cases from Qianhai Global Accessories"
}
```

```bash
curl -X POST http://localhost:3000/quotes \
  -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-005","product_description":"Custom phone cases","quantity":1000}'
```

### POST /quotes/:id/respond

Factory responds to a quote request with price and lead time.

- **Auth:** None

**Request body:**
```json
{
  "factory_id": "sz-005",
  "unit_price_usd": 2.40,
  "lead_time_days": 25,
  "notes": "Can provide samples in 7 days"
}
```

**Response:**
```json
{
  "quote_id": "q-abc12345",
  "status": "responded",
  "unit_price_usd": 2.40,
  "lead_time_days": 25
}
```

```bash
curl -X POST http://localhost:3000/quotes/q-abc12345/respond \
  -H "Content-Type: application/json" \
  -d '{"factory_id":"sz-005","unit_price_usd":2.40,"lead_time_days":25}'
```

---

## Orders

### POST /orders

Place an escrow-protected order from an accepted quote.

- **Auth:** JWT required (`Authorization: Bearer <token>`)

**Request body:**
```json
{
  "quote_id": "q-abc12345",
  "buyer_id": "buyer-001"
}
```

**Response:**
```json
{
  "order_id": "ord-abc12345",
  "quote_id": "q-abc12345",
  "factory_id": "sz-005",
  "buyer_id": "buyer-001",
  "status": "pending",
  "quantity": 1000,
  "unit_price_usd": 2.58,
  "total_price_usd": 2580,
  "escrow_held": true,
  "created_at": "2026-03-25T10:00:00.000Z",
  "estimated_ship_date": "2026-04-16T10:00:00.000Z"
}
```

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"quote_id":"q-abc12345","buyer_id":"buyer-001"}'
```

### GET /orders/:id

Track order status with full event history.

- **Auth:** None

**Response:**
```json
{
  "order_id": "ord-abc12345",
  "status": "in_production",
  "quantity": 1000,
  "total_price_usd": 2580,
  "escrow_held": true,
  "events": [
    { "event": "order_placed", "note": null, "created_at": "2026-03-25T10:00:00" },
    { "event": "confirmed", "note": "Factory confirmed", "created_at": "2026-03-25T12:00:00" },
    { "event": "in_production", "note": "Started production line", "created_at": "2026-03-26T09:00:00" }
  ]
}
```

```bash
curl http://localhost:3000/orders/ord-abc12345
```

### PATCH /orders/:id/status

Update production milestone (factory-side).

- **Auth:** None

**Request body:**
```json
{
  "status": "in_production",
  "note": "Started production line B"
}
```

Valid statuses: `confirmed` | `in_production` | `qc` | `shipped` | `delivered`

**Response:** Updated order object with events.

```bash
curl -X PATCH http://localhost:3000/orders/ord-abc12345/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in_production","note":"Started production"}'
```

---

## Auth

### POST /auth/register

Register a buyer or factory account.

- **Auth:** None

**Request body:**
```json
{
  "email": "buyer@example.com",
  "password": "securepassword",
  "role": "buyer",
  "factory_id": null
}
```

**Response:**
```json
{
  "user_id": "usr-abc12345",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"demo123","role":"buyer"}'
```

### POST /auth/login

Login and receive JWT token.

- **Auth:** None

**Request body:**
```json
{
  "email": "buyer@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user_id": "usr-abc12345",
  "role": "buyer",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"demo123"}'
```

---

## Onboarding

### POST /onboard

Submit a factory application for review.

- **Auth:** None

**Request body:**
```json
{
  "name_en": "Shenzhen Elite Electronics",
  "name_zh": "深圳精英电子",
  "city": "Shenzhen",
  "district": "Longhua",
  "categories": ["electronics_accessories", "cable_assembly"],
  "certifications": ["ISO9001", "CE"],
  "moq": 500,
  "capacity_units_per_month": 50000,
  "lead_time_sample": 7,
  "lead_time_production": 25,
  "price_tier": "mid",
  "contact_name": "Wang Wei",
  "wechat_id": "wang_wei_factory",
  "email": "wang@factory.com",
  "phone": "+86 138 0000 0000",
  "description": "ISO9001-certified manufacturer"
}
```

**Response:**
```json
{
  "application_id": "app-abc12345",
  "status": "pending",
  "message": "Application received. Our Shenzhen team will contact you within 2 business days."
}
```

```bash
curl -X POST http://localhost:3000/onboard \
  -H "Content-Type: application/json" \
  -d '{"name_en":"Test Factory","city":"Shenzhen","wechat_id":"test123","contact_name":"Test"}'
```

### GET /admin/applications

List factory applications (admin endpoint).

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by `pending` / `approved` / `rejected` |

**Response:**
```json
{
  "applications": [
    {
      "id": "app-abc12345",
      "name_en": "Test Factory",
      "status": "pending",
      "submitted_at": "2026-03-25T10:00:00"
    }
  ],
  "count": 1
}
```

```bash
curl "http://localhost:3000/admin/applications?status=pending"
```

---

## Quick Reply

### GET /factory/quick-reply

Magic link from WeChat notification — redirects to factory-mobile.html.

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `f` | string | Factory ID |
| `a` | string | Action (`quotes` / `orders`) |
| `t` | string | Target quote ID (optional) |

```bash
curl -L "http://localhost:3000/factory/quick-reply?f=sz-005&a=quotes"
```

---

## Analytics

### GET /analytics

Platform analytics snapshot.

- **Auth:** None

**Response:**
```json
{
  "total_factories": 10,
  "verified_factories": 8,
  "total_quotes": 15,
  "total_orders": 3,
  "pending_orders": 1,
  "total_gmv": 8240,
  "avg_unit_price": 3.2,
  "quotes_responded": 12,
  "quote_response_rate": 80,
  "cities_covered": 4,
  "quotes_by_factory": [...],
  "orders_by_status": [...],
  "top_categories": [...]
}
```

```bash
curl http://localhost:3000/analytics
```

---

## Test / Debug

### POST /test/notify

Send a test WeChat notification. No auth required. Useful for factory owners to verify their webhook is configured.

- **Auth:** None

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `factory_id` | string | Factory ID (default: `sz-001`) |

**Response:**
```json
{
  "sent": true,
  "webhook_url": "(dev mode — logged to console)",
  "payload": {
    "factory_id": "sz-001",
    "factory_name": "Longhua Electronics Co.",
    "factory_name_zh": "龙华电子科技有限公司",
    "buyer_id": "test-buyer",
    "product_description": "Test notification — 测试通知",
    "quantity": 1000,
    "target_price": 2.50,
    "quote_id": "q-test-abc123"
  }
}
```

```bash
curl -X POST "http://localhost:3000/test/notify?factory_id=sz-005"
```
