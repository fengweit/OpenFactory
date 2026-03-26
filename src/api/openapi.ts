/**
 * OpenAPI 3.0 specification for the OpenFactory REST API.
 * Covers all 38 endpoints with request/response schemas derived from
 * the Zod schemas in src/schemas/factory.ts and src/schemas/order.ts.
 */

const FactoryCategoryEnum = {
  type: "string" as const,
  enum: ["electronics_accessories", "pcb_assembly", "plastic_injection", "metal_enclosure", "cable_assembly"],
};

const PriceTierEnum = {
  type: "string" as const,
  enum: ["budget", "mid", "premium"],
};

const EscrowStatusEnum = {
  type: "string" as const,
  enum: ["pending_deposit", "deposit_held", "production_released", "final_released", "disputed", "refunded"],
};

const OrderStatusEnum = {
  type: "string" as const,
  enum: ["pending", "confirmed", "in_production", "qc", "shipped", "delivered", "disputed"],
};

const ErrorResponse = {
  type: "object" as const,
  properties: { error: { type: "string" } },
  required: ["error"],
};

const FactorySchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    name_zh: { type: "string" },
    location: {
      type: "object",
      properties: { city: { type: "string" }, district: { type: "string" } },
    },
    categories: { type: "array", items: FactoryCategoryEnum },
    moq: { type: "number" },
    lead_time_days: {
      type: "object",
      properties: { sample: { type: "number" }, production: { type: "number" } },
    },
    certifications: { type: "array", items: { type: "string" } },
    price_tier: PriceTierEnum,
    capacity_units_per_month: { type: "number" },
    accepts_foreign_buyers: { type: "boolean" },
    wechat_id: { type: "string" },
    wechat_webhook_url: { type: "string", format: "uri" },
    verified: { type: "boolean" },
    rating: { type: "number", minimum: 0, maximum: 5 },
    uscc: { type: "string", pattern: "^[0-9A-Z]{18}$" },
    legal_rep: { type: "string" },
    business_license_expiry: { type: "string" },
  },
};

const OrderSchema = {
  type: "object" as const,
  properties: {
    order_id: { type: "string" },
    quote_id: { type: "string" },
    factory_id: { type: "string" },
    buyer_id: { type: "string" },
    status: OrderStatusEnum,
    quantity: { type: "number" },
    unit_price_usd: { type: "number" },
    total_price_usd: { type: "number" },
    escrow_held: { type: "boolean" },
    escrow_status: EscrowStatusEnum,
    created_at: { type: "string" },
    estimated_ship_date: { type: "string" },
    tracking: { type: "string" },
  },
};

const MilestoneSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    order_id: { type: "string" },
    milestone: { type: "string" },
    reported_by: { type: "string" },
    photo_urls: { type: "string" },
    note: { type: "string" },
    created_at: { type: "string" },
  },
};

const EscrowEventSchema = {
  type: "object" as const,
  properties: {
    id: { type: "integer" },
    order_id: { type: "string" },
    from_status: { type: "string" },
    to_status: { type: "string" },
    triggered_by: { type: "string" },
    amount_usd: { type: "number" },
    note: { type: "string" },
    created_at: { type: "string" },
  },
};

const QcRequestSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    order_id: { type: "string" },
    provider: { type: "string" },
    inspection_type: { type: "string" },
    status: { type: "string" },
    created_at: { type: "string" },
  },
};

const DisputeSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    order_id: { type: "string" },
    raised_by: { type: "string", enum: ["buyer", "factory", "platform"] },
    reason: { type: "string" },
    evidence_urls: { type: "string" },
    status: { type: "string", enum: ["open", "resolved"] },
    resolution: { type: "string" },
    resolution_notes: { type: "string" },
    created_at: { type: "string" },
    resolved_at: { type: "string" },
  },
};

const bearerAuth = { bearerAuth: [] as string[] };

const tag = {
  factories: "Factories",
  orders: "Orders",
  quotes: "Quotes",
  escrow: "Escrow & Disputes",
  capacity: "Capacity & Pricing",
  auth: "Authentication",
  admin: "Admin",
  platform: "Platform",
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "OpenFactory API",
    version: "0.3.0",
    description:
      "The API layer that lets AI agents source directly from verified Chinese manufacturers. Instant quotes, live capacity, escrow-protected orders — all in milliseconds.",
    contact: { email: "hello@openfactory.ai" },
    license: { name: "ISC" },
  },
  servers: [
    { url: "/", description: "Current host" },
  ],
  tags: [
    { name: tag.factories, description: "Search, inspect, and verify factories" },
    { name: tag.quotes, description: "Request and respond to quotes" },
    { name: tag.orders, description: "Place and track orders" },
    { name: tag.escrow, description: "Escrow lifecycle and dispute resolution" },
    { name: tag.capacity, description: "Live capacity and pricing rules" },
    { name: tag.auth, description: "User registration and login" },
    { name: tag.admin, description: "Admin-only operations" },
    { name: tag.platform, description: "Health, analytics, webhooks, and testing" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Factory: FactorySchema,
      Order: OrderSchema,
      Milestone: MilestoneSchema,
      EscrowEvent: EscrowEventSchema,
      QcRequest: QcRequestSchema,
      Dispute: DisputeSchema,
      Error: ErrorResponse,
    },
  },
  paths: {
    // ── Platform ──────────────────────────────────────────────
    "/health": {
      get: {
        tags: [tag.platform],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          200: {
            description: "Service health",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                service: { type: "string" },
                version: { type: "string" },
                status: { type: "string", enum: ["ok"] },
                tools: { type: "array", items: { type: "string" } },
                total_factories: { type: "integer" },
                verified_factories: { type: "integer" },
                uptime_s: { type: "integer" },
              },
            }}},
          },
        },
      },
    },
    "/analytics": {
      get: {
        tags: [tag.platform],
        summary: "Platform analytics",
        operationId: "getAnalytics",
        responses: {
          200: {
            description: "Aggregate platform metrics",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },

    // ── Factories ─────────────────────────────────────────────
    "/factories": {
      get: {
        tags: [tag.factories],
        summary: "Search factories",
        operationId: "searchFactories",
        parameters: [
          { name: "category", in: "query", schema: FactoryCategoryEnum, description: "Filter by product category" },
          { name: "max_moq", in: "query", schema: { type: "integer" }, description: "Maximum MOQ" },
          { name: "price_tier", in: "query", schema: PriceTierEnum, description: "Price tier filter" },
          { name: "min_rating", in: "query", schema: { type: "number", minimum: 0, maximum: 5 }, description: "Minimum rating (0-5)" },
          { name: "verified_only", in: "query", schema: { type: "boolean" }, description: "Only return verified factories" },
        ],
        responses: {
          200: {
            description: "List of matching factories",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factories: { type: "array", items: { $ref: "#/components/schemas/Factory" } },
                count: { type: "integer" },
              },
            }}},
          },
        },
      },
    },
    "/factories/{id}": {
      get: {
        tags: [tag.factories],
        summary: "Get factory by ID",
        operationId: "getFactoryById",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Factory details", content: { "application/json": { schema: { $ref: "#/components/schemas/Factory" } } } },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/verify-identity": {
      get: {
        tags: [tag.factories],
        summary: "Get identity trust data",
        operationId: "getFactoryIdentity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Identity verification data",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                uscc: { type: "string" },
                uscc_valid: { type: "boolean" },
                legal_rep: { type: "string" },
                business_license_expiry: { type: "string" },
                verified: { type: "boolean" },
                identity_complete: { type: "boolean" },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/verify-uscc": {
      post: {
        tags: [tag.factories],
        summary: "Validate and store USCC",
        operationId: "verifyUscc",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["uscc"],
            properties: { uscc: { type: "string", pattern: "^[0-9A-Z]{18}$" } },
          }}},
        },
        responses: {
          200: {
            description: "USCC validation result",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                uscc: { type: "string" },
                uscc_valid: { type: "boolean" },
                checksum_valid: { type: "boolean" },
              },
            }}},
          },
          400: { description: "Invalid USCC", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/quotes": {
      get: {
        tags: [tag.quotes],
        summary: "Get quotes received by a factory",
        operationId: "getQuotesByFactory",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "List of quotes", content: { "application/json": { schema: { type: "array", items: { type: "object" } } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/orders": {
      get: {
        tags: [tag.orders],
        summary: "Get orders placed with a factory",
        operationId: "getOrdersByFactory",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "List of orders", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/performance": {
      get: {
        tags: [tag.factories],
        summary: "Factory trust metrics from transactional data",
        operationId: "getFactoryPerformance",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Performance metrics",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                total_orders: { type: "integer" },
                completed_orders: { type: "integer" },
                on_time_rate: { type: "number" },
                dispute_rate: { type: "number" },
                avg_lead_days: { type: "number" },
                total_gmv_usd: { type: "number" },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Capacity & Pricing ────────────────────────────────────
    "/factories/{id}/capacity": {
      get: {
        tags: [tag.capacity],
        summary: "Get declared capacity for a factory",
        operationId: "getFactoryCapacity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Capacity data",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                capacity: { type: "array", items: { type: "object" } },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        tags: [tag.capacity],
        summary: "Update declared capacity",
        operationId: "updateFactoryCapacity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["category"],
            properties: {
              category: { type: "string" },
              available_units: { type: "integer" },
              available_from: { type: "string", format: "date" },
              price_override_usd: { type: "number" },
            },
          }}},
        },
        responses: {
          200: { description: "Updated capacity", content: { "application/json": { schema: { type: "object" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/pricing-rules": {
      get: {
        tags: [tag.capacity],
        summary: "Get pricing rules for a factory",
        operationId: "getPricingRules",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Pricing rules",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                rules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      min_qty: { type: "integer" },
                      max_qty: { type: "integer" },
                      unit_price_usd: { type: "number" },
                      lead_time_days: { type: "integer" },
                    },
                  },
                },
              },
            }}},
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        tags: [tag.capacity],
        summary: "Upsert pricing rules",
        operationId: "upsertPricingRules",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "array",
            items: {
              type: "object",
              required: ["category", "unit_price_usd"],
              properties: {
                category: { type: "string" },
                min_qty: { type: "integer" },
                max_qty: { type: "integer" },
                unit_price_usd: { type: "number" },
                lead_time_days: { type: "integer" },
              },
            },
          }}},
        },
        responses: {
          200: {
            description: "Updated rules",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                rules: { type: "array", items: { type: "object" } },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/instant-quote": {
      get: {
        tags: [tag.capacity],
        summary: "Get binding instant quote from pricing rules",
        operationId: "getInstantQuote",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "category", in: "query", required: true, schema: { type: "string" }, description: "Product category" },
          { name: "qty", in: "query", required: true, schema: { type: "integer", minimum: 1 }, description: "Quantity" },
        ],
        responses: {
          200: {
            description: "Binding quote",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                factory_name: { type: "string" },
                category: { type: "string" },
                quantity: { type: "integer" },
                unit_price_usd: { type: "number" },
                total_price_usd: { type: "number" },
                lead_time_days: { type: "integer" },
                binding: { type: "boolean" },
              },
            }}},
          },
          400: { description: "Missing params", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "No pricing rules", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/capacity": {
      get: {
        tags: [tag.capacity],
        summary: "Live capacity query across all factories",
        operationId: "queryLiveCapacity",
        parameters: [
          { name: "category", in: "query", required: true, schema: { type: "string" }, description: "Product category" },
          { name: "qty", in: "query", required: true, schema: { type: "integer", minimum: 1 }, description: "Quantity needed" },
          { name: "max_days", in: "query", schema: { type: "integer" }, description: "Max lead time in days" },
        ],
        responses: {
          200: {
            description: "Available capacity",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                query: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    quantity: { type: "integer" },
                    max_days: { type: "integer", nullable: true },
                  },
                },
                count: { type: "integer" },
                results: { type: "array", items: { type: "object" } },
                computed_in_ms: { type: "number" },
              },
            }}},
          },
          400: { description: "Missing params", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Quotes ────────────────────────────────────────────────
    "/quotes": {
      post: {
        tags: [tag.quotes],
        summary: "Create a quote request",
        operationId: "createQuote",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["factory_id", "product_description", "quantity"],
            properties: {
              factory_id: { type: "string" },
              product_description: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
              buyer_id: { type: "string" },
              target_price_usd: { type: "number" },
              deadline_days: { type: "integer" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Quote created",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                quote_id: { type: "string" },
                factory_id: { type: "string" },
                quantity: { type: "integer" },
                unit_price_usd: { type: "number" },
                total_price_usd: { type: "number" },
                lead_time_days: { type: "integer" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/quotes/{id}/respond": {
      post: {
        tags: [tag.quotes],
        summary: "Factory responds to a quote",
        operationId: "respondToQuote",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["factory_id", "unit_price_usd", "lead_time_days"],
            properties: {
              factory_id: { type: "string" },
              unit_price_usd: { type: "number" },
              lead_time_days: { type: "integer" },
              notes: { type: "string" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Quote updated",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                quote_id: { type: "string" },
                status: { type: "string" },
                unit_price_usd: { type: "number" },
                lead_time_days: { type: "integer" },
              },
            }}},
          },
          404: { description: "Quote not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Orders ────────────────────────────────────────────────
    "/orders": {
      post: {
        tags: [tag.orders],
        summary: "Place an order",
        operationId: "placeOrder",
        security: [bearerAuth],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["quote_id", "buyer_id"],
            properties: {
              quote_id: { type: "string" },
              buyer_id: { type: "string" },
            },
          }}},
        },
        responses: {
          200: { description: "Order placed", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: [tag.orders],
        summary: "Track order with milestones and escrow events",
        operationId: "trackOrder",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Order with milestones and escrow events",
            content: { "application/json": { schema: {
              allOf: [
                { $ref: "#/components/schemas/Order" },
                {
                  type: "object",
                  properties: {
                    milestones: { type: "array", items: { $ref: "#/components/schemas/Milestone" } },
                    escrow_events: { type: "array", items: { $ref: "#/components/schemas/EscrowEvent" } },
                  },
                },
              ],
            }}},
          },
        },
      },
    },
    "/orders/{id}/status": {
      patch: {
        tags: [tag.orders],
        summary: "Update order status",
        operationId: "updateOrderStatus",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["status"],
            properties: {
              status: OrderStatusEnum,
              note: { type: "string" },
              photo_urls: { type: "array", items: { type: "string" } },
            },
          }}},
        },
        responses: {
          200: { description: "Updated order", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } },
        },
      },
    },
    "/orders/{id}/milestones": {
      get: {
        tags: [tag.orders],
        summary: "Get all milestones for an order",
        operationId: "getOrderMilestones",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Milestones",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                milestones: { type: "array", items: { $ref: "#/components/schemas/Milestone" } },
                count: { type: "integer" },
              },
            }}},
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: [tag.orders],
        summary: "Report a production milestone",
        operationId: "createMilestone",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["milestone"],
            properties: {
              milestone: { type: "string", description: "Milestone name (e.g. material_received, production_started)" },
              photo_urls: { type: "array", items: { type: "string", format: "uri" } },
              note: { type: "string" },
            },
          }}},
        },
        responses: {
          201: {
            description: "Milestone created",
            content: { "application/json": { schema: {
              allOf: [
                { $ref: "#/components/schemas/Milestone" },
                {
                  type: "object",
                  properties: {
                    escrow_transition: { $ref: "#/components/schemas/EscrowEvent" },
                  },
                },
              ],
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Forbidden — factory/admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/qc-request": {
      get: {
        tags: [tag.orders],
        summary: "Get QC inspection status",
        operationId: "getQcRequests",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "QC requests",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                qc_requests: { type: "array", items: { $ref: "#/components/schemas/QcRequest" } },
                count: { type: "integer" },
              },
            }}},
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: [tag.orders],
        summary: "Request third-party QC inspection",
        operationId: "createQcRequest",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["provider", "inspection_type"],
            properties: {
              provider: { type: "string", description: "QC provider name" },
              inspection_type: { type: "string", description: "Type of inspection" },
            },
          }}},
        },
        responses: {
          201: { description: "QC request created", content: { "application/json": { schema: { $ref: "#/components/schemas/QcRequest" } } } },
          400: { description: "Missing fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Escrow & Disputes ─────────────────────────────────────
    "/orders/{id}/escrow/lock": {
      post: {
        tags: [tag.escrow],
        summary: "Lock 30% deposit",
        operationId: "lockDeposit",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Deposit locked",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                deposit_locked: { type: "boolean" },
                deposit_amount_usd: { type: "number" },
                remaining_usd: { type: "number" },
                escrow_status: { type: "string" },
                escrow_event: { $ref: "#/components/schemas/EscrowEvent" },
                message: { type: "string" },
              },
            }}},
          },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Escrow already transitioned", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/release-escrow": {
      post: {
        tags: [tag.escrow],
        summary: "Release final escrow (buyer confirms receipt)",
        operationId: "releaseEscrow",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Escrow released",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                status: { type: "string" },
                escrow_event: { $ref: "#/components/schemas/EscrowEvent" },
                message: { type: "string" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Prerequisites not met", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/escrow-events": {
      get: {
        tags: [tag.escrow],
        summary: "Full escrow audit trail",
        operationId: "getEscrowEvents",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Escrow events",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                escrow_events: { type: "array", items: { $ref: "#/components/schemas/EscrowEvent" } },
                count: { type: "integer" },
              },
            }}},
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/escrow-transition": {
      post: {
        tags: [tag.escrow],
        summary: "Manual escrow state transition (admin)",
        operationId: "manualEscrowTransition",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["to_status"],
            properties: {
              to_status: EscrowStatusEnum,
              amount_usd: { type: "number" },
              note: { type: "string" },
            },
          }}},
        },
        responses: {
          200: { description: "Transition recorded", content: { "application/json": { schema: { $ref: "#/components/schemas/EscrowEvent" } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/dispute": {
      get: {
        tags: [tag.escrow],
        summary: "Get disputes for an order",
        operationId: "getDisputes",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Disputes",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                disputes: { type: "array", items: { $ref: "#/components/schemas/Dispute" } },
                count: { type: "integer" },
              },
            }}},
          },
          404: { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: [tag.escrow],
        summary: "Raise a dispute",
        operationId: "raiseDispute",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["raised_by", "reason"],
            properties: {
              raised_by: { type: "string", enum: ["buyer", "factory", "platform"] },
              reason: { type: "string" },
              evidence_urls: { type: "array", items: { type: "string", format: "uri" } },
            },
          }}},
        },
        responses: {
          201: { description: "Dispute raised", content: { "application/json": { schema: { $ref: "#/components/schemas/Dispute" } } } },
          400: { description: "Missing fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Already disputed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/disputes/{id}/resolve": {
      post: {
        tags: [tag.escrow],
        summary: "Resolve a dispute (admin)",
        operationId: "resolveDispute",
        security: [bearerAuth],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["resolution"],
            properties: {
              resolution: { type: "string", enum: ["refund_full", "refund_partial", "rejected"] },
              resolution_notes: { type: "string" },
            },
          }}},
        },
        responses: {
          200: { description: "Dispute resolved", content: { "application/json": { schema: { $ref: "#/components/schemas/Dispute" } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Dispute not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Webhooks ──────────────────────────────────────────────
    "/webhooks/stripe": {
      post: {
        tags: [tag.platform],
        summary: "Handle Stripe webhook events",
        operationId: "handleStripeWebhook",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            properties: {
              type: { type: "string" },
              data: { type: "object", properties: { object: { type: "object" } } },
            },
          }}},
        },
        responses: {
          200: {
            description: "Acknowledged",
            content: { "application/json": { schema: {
              type: "object",
              properties: { received: { type: "boolean" }, result: { type: "object" } },
            }}},
          },
        },
      },
    },

    // ── Onboarding ────────────────────────────────────────────
    "/onboard": {
      post: {
        tags: [tag.factories],
        summary: "Submit factory application",
        operationId: "submitApplication",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["name_en"],
            properties: {
              name_en: { type: "string" },
              name_zh: { type: "string" },
              city: { type: "string", default: "Shenzhen" },
              district: { type: "string" },
              categories: { type: "array", items: FactoryCategoryEnum },
              certifications: { type: "array", items: { type: "string" } },
              moq: { type: "integer" },
              capacity_units_per_month: { type: "integer" },
              lead_time_sample: { type: "integer" },
              lead_time_production: { type: "integer" },
              price_tier: PriceTierEnum,
              contact_name: { type: "string" },
              wechat_id: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              description: { type: "string" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Application submitted",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                application_id: { type: "string" },
                status: { type: "string", enum: ["pending"] },
                message: { type: "string" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Admin ─────────────────────────────────────────────────
    "/admin/applications": {
      get: {
        tags: [tag.admin],
        summary: "List factory applications",
        operationId: "listApplications",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "rejected"] }, description: "Filter by status" },
        ],
        responses: {
          200: {
            description: "Applications",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                applications: { type: "array", items: { type: "object" } },
                count: { type: "integer" },
              },
            }}},
          },
        },
      },
    },

    // ── Auth ──────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: [tag.auth],
        summary: "Register a new user",
        operationId: "registerUser",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", minLength: 6 },
              role: { type: "string", enum: ["buyer", "factory"], default: "buyer" },
              factory_id: { type: "string", description: "Required when role is factory" },
            },
          }}},
        },
        responses: {
          200: {
            description: "User registered",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                user_id: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                token: { type: "string" },
              },
            }}},
          },
          400: { description: "Registration error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: [tag.auth],
        summary: "Login",
        operationId: "loginUser",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Login successful",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                user_id: { type: "string" },
                email: { type: "string" },
                role: { type: "string" },
                token: { type: "string" },
              },
            }}},
          },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── WeChat ────────────────────────────────────────────────
    "/factory/quick-reply": {
      get: {
        tags: [tag.platform],
        summary: "WeChat magic link redirect",
        operationId: "quickReply",
        parameters: [
          { name: "f", in: "query", schema: { type: "string" }, description: "Factory ID" },
          { name: "a", in: "query", schema: { type: "string", default: "quotes" }, description: "Action" },
          { name: "t", in: "query", schema: { type: "string" }, description: "Token" },
        ],
        responses: {
          302: { description: "Redirect to factory-mobile.html" },
        },
      },
    },
    "/test/notify": {
      post: {
        tags: [tag.platform],
        summary: "Send test WeChat notification",
        operationId: "testNotify",
        parameters: [
          { name: "factory_id", in: "query", schema: { type: "string", default: "sz-001" }, description: "Factory to send test to" },
        ],
        responses: {
          200: {
            description: "Notification result",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                sent: { type: "boolean" },
                webhook_url: { type: "string" },
                payload: { type: "object" },
                error: { type: "string" },
              },
            }}},
          },
        },
      },
    },
  },
};
