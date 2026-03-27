/**
 * OpenAPI 3.0 specification for the OpenFactory REST API.
 * Covers all 85+ endpoint operations with request/response schemas derived from
 * the Zod schemas in src/schemas/factory.ts, src/schemas/order.ts, and src/schemas/quote.ts.
 */

const FactoryCategoryEnum = {
  type: "string" as const,
  enum: ["electronics_accessories", "pcb_assembly", "plastic_injection", "metal_enclosure", "cable_assembly", "apparel_textiles", "footwear", "toys_games", "furniture", "packaging_printing", "auto_parts", "led_lighting", "beauty_cosmetics", "food_processing", "medical_devices", "home_appliances", "hardware_tools", "ceramic_glass", "rubber_silicone", "jewelry_watches", "bags_luggage", "stationery_office", "building_materials", "pet_products", "sports_outdoor"],
};

const PriceTierEnum = {
  type: "string" as const,
  enum: ["budget", "mid", "premium"],
};

const EscrowStatusEnum = {
  type: "string" as const,
  enum: ["pending_deposit", "deposit_held", "production_released", "qc_released", "final_released", "disputed", "refunded"],
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
    trust_score: { type: "number", minimum: 0, maximum: 100, nullable: true },
    lat: { type: "number" },
    lng: { type: "number" },
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

const ReviewSchema = {
  type: "object" as const,
  properties: {
    id: { type: "string" },
    order_id: { type: "string" },
    factory_id: { type: "string" },
    buyer_id: { type: "string" },
    rating: { type: "number", minimum: 1, maximum: 5 },
    quality_rating: { type: "number", minimum: 1, maximum: 5 },
    communication_rating: { type: "number", minimum: 1, maximum: 5 },
    accuracy_rating: { type: "number", minimum: 1, maximum: 5 },
    comment: { type: "string" },
    created_at: { type: "string" },
  },
};

const TrustScoreSchema = {
  type: "object" as const,
  properties: {
    factory_id: { type: "string" },
    score: { type: "number", minimum: 0, maximum: 100 },
    breakdown: {
      type: "object",
      properties: {
        uscc_verified: { type: "number" },
        milestone_timeliness: { type: "number" },
        qc_pass_rate: { type: "number" },
        photo_proof: { type: "number" },
        facility_photos: { type: "number" },
      },
    },
  },
};

const FactoryPhotoSchema = {
  type: "object" as const,
  properties: {
    id: { type: "integer" },
    photo_type: { type: "string", enum: ["facility", "equipment", "product_line", "team"] },
    url: { type: "string" },
    original_filename: { type: "string" },
    uploaded_at: { type: "string" },
    file_size_bytes: { type: "integer" },
  },
};

const QuoteRequestBodySchema = {
  type: "object" as const,
  required: ["factory_id", "product_description", "quantity"],
  properties: {
    factory_id: { type: "string" },
    product_description: { type: "string" },
    quantity: { type: "integer", minimum: 1 },
    buyer_id: { type: "string" },
    target_price_usd: { type: "number" },
    deadline_days: { type: "integer" },
    specs: { type: "object", additionalProperties: true },
  },
};

const QuoteResponseSchema = {
  type: "object" as const,
  properties: {
    quote_id: { type: "string" },
    factory_id: { type: "string" },
    unit_price_usd: { type: "number" },
    total_price_usd: { type: "number" },
    lead_time_days: { type: "integer" },
    moq: { type: "number" },
    valid_until: { type: "string" },
    notes: { type: "string" },
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
  trust: "Trust & Reviews",
  qc: "QC Inspection",
};

const idParam = { name: "id", in: "path" as const, required: true, schema: { type: "string" } };

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "OpenFactory API",
    version: "0.4.0",
    description:
      "The API layer that lets AI agents source directly from verified Chinese manufacturers. Instant quotes, live capacity, escrow-protected orders — all in milliseconds. Covers the full trust workflow: milestones, escrow, QC triggers, reviews, and trust scoring.",
    contact: { email: "hello@openfactory.ai" },
    license: { name: "ISC" },
  },
  servers: [
    { url: "/", description: "Current host" },
  ],
  tags: [
    { name: tag.factories, description: "Search, inspect, verify factories, and manage photos" },
    { name: tag.quotes, description: "Request and respond to quotes, broadcast RFQs" },
    { name: tag.orders, description: "Place, track, and monitor orders" },
    { name: tag.escrow, description: "Escrow lifecycle: deposit lock, milestone-gated release, disputes" },
    { name: tag.capacity, description: "Live capacity and pricing rules" },
    { name: tag.trust, description: "Trust scores, delivery performance, reviews" },
    { name: tag.qc, description: "Third-party QC inspection requests and results" },
    { name: tag.auth, description: "User registration, login, WeChat/phone auth" },
    { name: tag.admin, description: "Admin-only operations: applications, API keys, auth linking" },
    { name: tag.platform, description: "Health, analytics, webhooks, testing, and documentation" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      apiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API key for AI agent partners",
      },
    },
    schemas: {
      Factory: FactorySchema,
      Order: OrderSchema,
      Milestone: MilestoneSchema,
      EscrowEvent: EscrowEventSchema,
      QcRequest: QcRequestSchema,
      Dispute: DisputeSchema,
      Review: ReviewSchema,
      TrustScore: TrustScoreSchema,
      FactoryPhoto: FactoryPhotoSchema,
      QuoteRequest: QuoteRequestBodySchema,
      QuoteResponse: QuoteResponseSchema,
      Error: ErrorResponse,
    },
  },
  paths: {
    // ── Platform ──────────────────────────────────────────────
    "/openapi.json": {
      get: {
        tags: [tag.platform],
        summary: "OpenAPI 3.0 JSON specification",
        operationId: "getOpenApiSpec",
        responses: {
          200: { description: "OpenAPI spec", content: { "application/json": { schema: { type: "object" } } } },
        },
      },
    },
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
                service: { type: "string", example: "OpenFactory API" },
                version: { type: "string", example: "0.3.0" },
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
            description: "Aggregate platform metrics (factory count, quote volume, order count, GMV)",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                total_factories: { type: "integer" },
                verified_factories: { type: "integer" },
                total_quotes: { type: "integer" },
                total_orders: { type: "integer" },
                total_gmv_usd: { type: "number" },
              },
            }}},
          },
        },
      },
    },
    "/docs/api-schema": {
      get: {
        tags: [tag.platform],
        summary: "Complete OpenAPI 3.0 JSON spec for all endpoints",
        operationId: "getApiSchema",
        description: "Returns the full OpenAPI 3.0 specification covering all endpoints with request/response schemas, auth requirements, and examples. Suitable for import into any OpenAPI-compatible tool.",
        responses: {
          200: { description: "OpenAPI 3.0 specification", content: { "application/json": { schema: { type: "object" } } } },
        },
      },
    },

    // ── Factories ─────────────────────────────────────────────
    "/factories/public": {
      get: {
        tags: [tag.factories],
        summary: "Search factories (public, no contact info)",
        operationId: "searchFactoriesPublic",
        description: "Unauthenticated factory search. Returns curated subset without contact info (no wechat_id, email, phone). Suitable for public-facing apps.",
        parameters: [
          { name: "category", in: "query", schema: FactoryCategoryEnum, description: "Filter by product category" },
          { name: "verified_only", in: "query", schema: { type: "boolean" }, description: "Only return verified factories" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["trust_score", "rating", "moq"] }, description: "Sort order" },
          { name: "min_trust_score", in: "query", schema: { type: "number", minimum: 0, maximum: 100 }, description: "Minimum trust score (0-100)" },
        ],
        responses: {
          200: {
            description: "List of factories (public fields only)",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factories: { type: "array", items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    name_zh: { type: "string" },
                    location: { type: "object", properties: { city: { type: "string" }, district: { type: "string" } } },
                    categories: { type: "array", items: FactoryCategoryEnum },
                    certifications: { type: "array", items: { type: "string" } },
                    verified: { type: "boolean" },
                    trust_score: { type: "number", nullable: true },
                    price_tier: PriceTierEnum,
                    moq: { type: "number" },
                    lead_time_days: { type: "object", properties: { sample: { type: "number" }, production: { type: "number" } } },
                    capacity_units_per_month: { type: "number" },
                    rating: { type: "number" },
                    lat: { type: "number" },
                    lng: { type: "number" },
                    has_uscc: { type: "boolean" },
                    identity_complete: { type: "boolean" },
                    business_license_valid: { type: "boolean" },
                  },
                }},
                count: { type: "integer" },
              },
            }}},
          },
        },
      },
    },
    "/factories": {
      get: {
        tags: [tag.factories],
        summary: "Search factories (authenticated, full details)",
        operationId: "searchFactories",
        security: [bearerAuth, { apiKeyAuth: [] }],
        description: "Authenticated factory search with full details including contact info. Requires Bearer token or API key.",
        parameters: [
          { name: "category", in: "query", schema: FactoryCategoryEnum, description: "Filter by product category" },
          { name: "max_moq", in: "query", schema: { type: "integer" }, description: "Maximum MOQ" },
          { name: "price_tier", in: "query", schema: PriceTierEnum, description: "Price tier filter" },
          { name: "min_rating", in: "query", schema: { type: "number", minimum: 0, maximum: 5 }, description: "Minimum rating (0-5)" },
          { name: "verified_only", in: "query", schema: { type: "boolean" }, description: "Only return verified factories" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["trust_score", "rating", "moq"] }, description: "Sort order" },
          { name: "min_trust_score", in: "query", schema: { type: "number", minimum: 0, maximum: 100 }, description: "Minimum trust score (0-100)" },
        ],
        responses: {
          200: {
            description: "List of matching factories with full details",
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
        description: "Returns full factory profile with live-computed trust score and breakdown.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Factory details with trust score",
            content: { "application/json": { schema: {
              allOf: [
                { $ref: "#/components/schemas/Factory" },
                { type: "object", properties: {
                  trust_score: { type: "number", nullable: true },
                  trust_score_breakdown: { type: "object" },
                }},
              ],
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/verify-identity": {
      get: {
        tags: [tag.factories],
        summary: "Get identity trust data",
        operationId: "getFactoryIdentity",
        description: "Returns factory legal identity for buyer due diligence: USCC, legal rep, business license expiry, verification status.",
        parameters: [idParam],
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
        description: "Validates the 18-character Unified Social Credit Code (USCC) checksum and stores it on the factory record.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["uscc"],
            properties: { uscc: { type: "string", pattern: "^[0-9A-Z]{18}$", example: "91440300MA5EYNJ69B" } },
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
    "/factories/{id}/photos": {
      get: {
        tags: [tag.factories],
        summary: "List factory facility photos",
        operationId: "getFactoryPhotos",
        description: "Returns all uploaded factory facility photos sorted by upload date (newest first).",
        parameters: [idParam],
        responses: {
          200: {
            description: "Factory photos",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                photos: { type: "array", items: { $ref: "#/components/schemas/FactoryPhoto" } },
                count: { type: "integer" },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: [tag.factories],
        summary: "Upload factory facility photos",
        operationId: "uploadFactoryPhotos",
        security: [bearerAuth],
        description: "Upload facility, equipment, product line, or team photos. JPEG/PNG/WebP only, max 10 files. Field name determines photo_type (facility, equipment, product_line, team).",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: {
            type: "object",
            properties: {
              facility: { type: "string", format: "binary", description: "Facility photo (JPEG/PNG/WebP)" },
              equipment: { type: "string", format: "binary", description: "Equipment photo" },
              product_line: { type: "string", format: "binary", description: "Product line photo" },
              team: { type: "string", format: "binary", description: "Team photo" },
            },
          }}},
        },
        responses: {
          201: {
            description: "Photos uploaded",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                photos: { type: "array", items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    original_filename: { type: "string" },
                    file_size_bytes: { type: "integer" },
                    photo_type: { type: "string" },
                  },
                }},
                count: { type: "integer" },
              },
            }}},
          },
          400: { description: "No files or invalid type", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Not the factory owner or admin", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/quotes": {
      get: {
        tags: [tag.quotes],
        summary: "Get quotes received by a factory",
        operationId: "getQuotesByFactory",
        parameters: [idParam],
        responses: {
          200: { description: "List of quotes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/QuoteResponse" } } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/orders": {
      get: {
        tags: [tag.orders],
        summary: "Get orders placed with a factory",
        operationId: "getOrdersByFactory",
        parameters: [idParam],
        responses: {
          200: { description: "List of orders", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } } },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/performance": {
      get: {
        tags: [tag.trust],
        summary: "Factory trust metrics from transactional data",
        operationId: "getFactoryPerformance",
        description: "Earned trust metrics computed from real transactional data: on-time delivery, lead time accuracy, QC pass rate, milestone responsiveness.",
        parameters: [idParam],
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
    "/factories/{id}/delivery-performance": {
      get: {
        tags: [tag.trust],
        summary: "Delivery statistics from real order data",
        operationId: "getDeliveryPerformance",
        description: "Delivery performance statistics computed from actual order fulfillment data.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Delivery statistics",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                total_delivered: { type: "integer" },
                on_time_count: { type: "integer" },
                late_count: { type: "integer" },
                on_time_rate: { type: "number" },
                avg_delay_days: { type: "number" },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/delivery-score": {
      get: {
        tags: [tag.trust],
        summary: "Scored delivery data",
        operationId: "getDeliveryScore",
        description: "Delivery score from factory_delivery_scores table, used as input to composite trust score.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Delivery score data",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                score: { type: "number" },
                total_orders: { type: "integer" },
                on_time_rate: { type: "number" },
                computed_at: { type: "string" },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/trust-score": {
      get: {
        tags: [tag.trust],
        summary: "Composite 0-100 trust score",
        operationId: "getTrustScore",
        description: "Composite trust score (0-100) with breakdown: USCC verification (22.5), milestone timeliness (22.5), QC pass rate (22.5), photo proof (22.5), facility photos (10).",
        parameters: [idParam],
        responses: {
          200: {
            description: "Trust score with breakdown",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TrustScore" } } },
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/trust-score/recompute": {
      post: {
        tags: [tag.trust],
        summary: "Admin recomputes trust score",
        operationId: "recomputeTrustScore",
        security: [bearerAuth],
        description: "Admin-only endpoint to force recomputation of a factory's trust score.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Recomputed trust score",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TrustScore" } } },
          },
          403: { description: "Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/trust-breakdown": {
      get: {
        tags: [tag.trust],
        summary: "Detailed trust score component breakdown",
        operationId: "getTrustBreakdown",
        description: "Returns each trust score component with its score, maximum possible, and human-readable description explaining why a factory is rated what it is.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Trust breakdown",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                score: { type: "number" },
                breakdown: {
                  type: "object",
                  properties: {
                    uscc_verified: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, description: { type: "string" } } },
                    milestone_timeliness: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, description: { type: "string" } } },
                    qc_pass_rate: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, description: { type: "string" } } },
                    photo_proof: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, description: { type: "string" } } },
                    facility_photos: { type: "object", properties: { score: { type: "number" }, max: { type: "number" }, description: { type: "string" } } },
                  },
                },
              },
            }}},
          },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/factories/{id}/reviews": {
      get: {
        tags: [tag.trust],
        summary: "Get all buyer reviews for a factory",
        operationId: "getFactoryReviews",
        description: "Returns all buyer reviews with summary statistics (average ratings, count).",
        parameters: [idParam],
        responses: {
          200: {
            description: "Reviews with summary",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                reviews: { type: "array", items: { $ref: "#/components/schemas/Review" } },
                summary: {
                  type: "object",
                  properties: {
                    avg_rating: { type: "number" },
                    avg_quality: { type: "number" },
                    avg_communication: { type: "number" },
                    avg_accuracy: { type: "number" },
                    total_reviews: { type: "integer" },
                  },
                },
                count: { type: "integer" },
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
        parameters: [idParam],
        responses: {
          200: {
            description: "Capacity data",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                factory_id: { type: "string" },
                capacity: { type: "array", items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    available_units: { type: "integer" },
                    available_from: { type: "string", format: "date" },
                    price_override_usd: { type: "number" },
                  },
                }},
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
        parameters: [idParam],
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
        parameters: [idParam],
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
        parameters: [idParam],
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
        description: "Sub-second binding quote from pre-declared pricing rules. Valid 48 hours.",
        parameters: [
          idParam,
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
        description: "Query real-time manufacturing capacity across all GBA factories. Returns factories that can fulfill the requested quantity now.",
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
        security: [bearerAuth, { apiKeyAuth: [] }],
        description: "Request a price quote from a specific factory. Returns unit price, lead time, and a 7-day valid quote_id. Triggers WeChat notification to factory.",
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: { $ref: "#/components/schemas/QuoteRequest" },
            example: {
              factory_id: "sz-001",
              product_description: "USB-C charging cable, 1m, braided nylon",
              quantity: 5000,
              buyer_id: "buyer-123",
              target_price_usd: 1.50,
            },
          }},
        },
        responses: {
          200: {
            description: "Quote created",
            content: { "application/json": {
              schema: { $ref: "#/components/schemas/QuoteResponse" },
              example: {
                quote_id: "q-abc123",
                factory_id: "sz-001",
                unit_price_usd: 1.65,
                total_price_usd: 8250,
                lead_time_days: 21,
                moq: 1000,
                valid_until: "2026-04-03T00:00:00.000Z",
              },
            }},
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
        parameters: [idParam],
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
    "/rfq": {
      post: {
        tags: [tag.quotes],
        summary: "Broadcast RFQ to matching factories",
        operationId: "createRfq",
        description: "Broadcast a Request for Quotation to all factories matching the specified categories. Returns quotes from multiple factories.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["product_description", "quantity", "categories"],
            properties: {
              product_description: { type: "string" },
              quantity: { type: "integer", minimum: 1 },
              target_price_usd: { type: "number" },
              categories: { type: "array", items: FactoryCategoryEnum },
              max_lead_time_days: { type: "integer" },
              buyer_id: { type: "string" },
            },
          },
          example: {
            product_description: "Custom phone case, TPU material",
            quantity: 10000,
            categories: ["plastic_injection"],
            target_price_usd: 0.80,
            buyer_id: "buyer-456",
          }}},
        },
        responses: {
          201: {
            description: "RFQ created with quotes from matching factories",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                rfq_id: { type: "string" },
                product_description: { type: "string" },
                quantity: { type: "integer" },
                quotes: { type: "array", items: { $ref: "#/components/schemas/QuoteResponse" } },
                factory_count: { type: "integer" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/rfq/{id}": {
      get: {
        tags: [tag.quotes],
        summary: "Get RFQ quote responses grouped by factory",
        operationId: "getRfqById",
        parameters: [idParam],
        responses: {
          200: {
            description: "RFQ with all factory responses",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                rfq_id: { type: "string" },
                product_description: { type: "string" },
                quantity: { type: "integer" },
                quotes: { type: "array", items: { $ref: "#/components/schemas/QuoteResponse" } },
                factory_count: { type: "integer" },
              },
            }}},
          },
          404: { description: "RFQ not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Orders ────────────────────────────────────────────────
    "/orders": {
      post: {
        tags: [tag.orders],
        summary: "Place an order",
        operationId: "placeOrder",
        security: [bearerAuth, { apiKeyAuth: [] }],
        description: "Place a manufacturing order from an accepted quote. Automatically creates Stripe escrow, sends WeChat notification to factory, and email confirmation to buyer.",
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["quote_id", "buyer_id"],
              properties: {
                quote_id: { type: "string" },
                buyer_id: { type: "string" },
              },
            },
            example: { quote_id: "q-abc123", buyer_id: "buyer-123" },
          }},
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
        security: [bearerAuth, { apiKeyAuth: [] }],
        description: "Returns full order details including production milestones and escrow audit trail.",
        parameters: [idParam],
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
        security: [bearerAuth],
        description: "Factory updates order production status. Enforces sequential progression: pending → confirmed → in_production → qc → shipped → delivered. Sends shipping notification on 'shipped'.",
        parameters: [idParam],
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
          403: { description: "Not factory owner or admin", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          422: { description: "Invalid status transition", content: { "application/json": { schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              current_status: { type: "string" },
              allowed_transitions: { type: "array", items: { type: "string" } },
            },
          }}}},
        },
      },
    },
    "/orders/{id}/health": {
      get: {
        tags: [tag.orders],
        summary: "Real-time order health score",
        operationId: "getOrderHealth",
        security: [bearerAuth],
        description: "Returns a real-time health score for AI agent monitoring. Includes risk factors and recommended actions.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Order health assessment",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                health_score: { type: "number", minimum: 0, maximum: 100 },
                status: { type: "string" },
                risk_factors: { type: "array", items: { type: "string" } },
                days_since_last_update: { type: "integer" },
                milestone_progress: { type: "number" },
              },
            }}},
          },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/stale": {
      get: {
        tags: [tag.orders],
        summary: "Find stale orders with no production updates",
        operationId: "getStaleOrders",
        security: [bearerAuth],
        description: "Finds orders with no production updates beyond the threshold. Triggers buyer alerts on first detection. Buyers see only their own stale orders; admins see all.",
        parameters: [
          { name: "threshold_days", in: "query", schema: { type: "integer", minimum: 1, default: 5 }, description: "Days since last update to consider stale" },
        ],
        responses: {
          200: {
            description: "Stale orders",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                stale_orders: { type: "array", items: {
                  type: "object",
                  properties: {
                    order_id: { type: "string" },
                    factory_id: { type: "string" },
                    buyer_id: { type: "string" },
                    status: { type: "string" },
                    days_since_last_update: { type: "integer" },
                    expected_milestone: { type: "string" },
                  },
                }},
                count: { type: "integer" },
                threshold_days: { type: "integer" },
              },
            }}},
          },
          403: { description: "Buyers or admins only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/milestones": {
      get: {
        tags: [tag.orders],
        summary: "Get all milestones for an order",
        operationId: "getOrderMilestones",
        security: [bearerAuth],
        description: "Returns full milestone timeline with photos, notes, timestamps, and uploaded photo details.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Milestones with photos",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                milestones: { type: "array", items: {
                  allOf: [
                    { $ref: "#/components/schemas/Milestone" },
                    { type: "object", properties: {
                      uploaded_photos: { type: "array", items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          url: { type: "string" },
                          original_filename: { type: "string" },
                          uploaded_at: { type: "string" },
                          file_size_bytes: { type: "integer" },
                        },
                      }},
                    }},
                  ],
                }},
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
        description: "Factory reports a production milestone. Enforces ordering (e.g. production_started requires material_received). May trigger automatic escrow transition. Notifies buyer via email and WeChat.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["milestone"],
              properties: {
                milestone: { type: "string", description: "Milestone name", enum: ["material_received", "production_started", "production_50", "production_complete", "qc_pass", "packed", "shipped"] },
                photo_urls: { type: "array", items: { type: "string", format: "uri" } },
                note: { type: "string" },
              },
            },
            example: { milestone: "production_started", note: "Production line #3 assigned" },
          }},
        },
        responses: {
          201: {
            description: "Milestone created (may include escrow transition)",
            content: { "application/json": { schema: {
              allOf: [
                { $ref: "#/components/schemas/Milestone" },
                {
                  type: "object",
                  properties: {
                    photo_upload_url: { type: "string", description: "URL to upload proof photos" },
                    escrow_transition: { $ref: "#/components/schemas/EscrowEvent" },
                  },
                },
              ],
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Factory or admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/milestones/{milestoneId}/photos": {
      post: {
        tags: [tag.orders],
        summary: "Upload milestone proof photos",
        operationId: "uploadMilestonePhotos",
        security: [bearerAuth],
        description: "Upload proof photos for a specific milestone. JPEG, PNG, WebP only. Max 5 files, 5MB each.",
        parameters: [
          idParam,
          { name: "milestoneId", in: "path", required: true, schema: { type: "string" }, description: "Milestone ID" },
        ],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: {
            type: "object",
            properties: {
              file: { type: "string", format: "binary", description: "Image file (JPEG/PNG/WebP, max 5MB)" },
            },
          }}},
        },
        responses: {
          201: {
            description: "Photos uploaded",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                milestone_id: { type: "integer" },
                order_id: { type: "string" },
                photos: { type: "array", items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    original_filename: { type: "string" },
                    file_size_bytes: { type: "integer" },
                  },
                }},
                count: { type: "integer" },
              },
            }}},
          },
          400: { description: "No files or invalid type", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Factory or admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Milestone or order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/review": {
      post: {
        tags: [tag.trust],
        summary: "Submit buyer review for a delivered order",
        operationId: "submitReview",
        description: "Submit a buyer review with ratings (1-5) for quality, communication, and accuracy. One review per order. Triggers trust score recomputation.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["buyer_id", "rating", "quality_rating", "communication_rating", "accuracy_rating"],
              properties: {
                buyer_id: { type: "string" },
                rating: { type: "number", minimum: 1, maximum: 5 },
                quality_rating: { type: "number", minimum: 1, maximum: 5 },
                communication_rating: { type: "number", minimum: 1, maximum: 5 },
                accuracy_rating: { type: "number", minimum: 1, maximum: 5 },
                comment: { type: "string" },
              },
            },
            example: { buyer_id: "buyer-123", rating: 4, quality_rating: 5, communication_rating: 4, accuracy_rating: 4, comment: "Great quality, slight delay" },
          }},
        },
        responses: {
          201: { description: "Review created", content: { "application/json": { schema: { $ref: "#/components/schemas/Review" } } } },
          400: { description: "Missing fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Review already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── QC Inspection ─────────────────────────────────────────
    "/orders/{id}/qc-request": {
      get: {
        tags: [tag.qc],
        summary: "Get QC inspection status (singular alias)",
        operationId: "getQcRequest",
        description: "Backwards-compatible alias for /orders/{id}/qc-requests.",
        parameters: [idParam],
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
        tags: [tag.qc],
        summary: "Request third-party QC inspection",
        operationId: "createQcRequest",
        description: "Request a third-party QC inspection. Supported providers: qima, sgs, bureau_veritas, manual. Requires the order to have reached the 'qc' milestone.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["provider"],
              properties: {
                provider: { type: "string", enum: ["qima", "sgs", "bureau_veritas", "manual"], description: "QC provider name" },
                inspection_type: { type: "string", description: "Type of inspection (e.g. pre-shipment, during-production)" },
                buyer_id: { type: "string" },
              },
            },
            example: { provider: "qima", inspection_type: "pre-shipment", buyer_id: "buyer-123" },
          }},
        },
        responses: {
          201: { description: "QC request created", content: { "application/json": { schema: { $ref: "#/components/schemas/QcRequest" } } } },
          400: { description: "Missing fields", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Milestone prerequisite not met", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/qc-requests": {
      get: {
        tags: [tag.qc],
        summary: "Get QC inspection requests for an order",
        operationId: "getQcRequests",
        description: "Retrieve all QC inspection requests for an order with their status and results.",
        parameters: [idParam],
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
    },
    "/orders/{id}/qc-result": {
      post: {
        tags: [tag.qc],
        summary: "Post QC pass/fail result (webhook)",
        operationId: "submitQcResult",
        description: "Webhook endpoint for QC providers to post inspection results. Triggers trust score recomputation.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["result"],
              properties: {
                result: { type: "string", enum: ["passed", "failed"] },
                inspector_notes: { type: "string" },
                report_url: { type: "string", format: "uri" },
              },
            },
            example: { result: "passed", inspector_notes: "All items within spec", report_url: "https://qima.com/reports/12345" },
          }},
        },
        responses: {
          200: {
            description: "QC result recorded",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                result: { type: "string" },
                qc_request_id: { type: "string" },
                inspector_notes: { type: "string" },
                report_url: { type: "string" },
              },
            }}},
          },
          400: { description: "Invalid result", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Escrow & Disputes ─────────────────────────────────────
    "/orders/{id}/escrow/lock": {
      post: {
        tags: [tag.escrow],
        summary: "Lock 30% deposit via Stripe",
        operationId: "lockDeposit",
        security: [bearerAuth],
        description: "Lock 30% deposit via Stripe PaymentIntent (capture_method: manual). Transitions escrow from pending_deposit to deposit_held. Factory can now begin production.",
        parameters: [idParam],
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
                payment_intent_id: { type: "string" },
                escrow_provider: { type: "string", enum: ["stripe"] },
                message: { type: "string" },
              },
            }}},
          },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Escrow already transitioned", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/orders/{id}/escrow/release": {
      post: {
        tags: [tag.escrow],
        summary: "Milestone-based partial escrow release (30/40/30)",
        operationId: "releaseMilestoneEscrow",
        security: [bearerAuth],
        description: "Milestone-gated partial escrow release via Stripe capture. Structure: production_started (30%), qc_pass (40%), shipped (30%). Validates milestone completion and photo evidence before release.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["milestone"],
              properties: {
                milestone: { type: "string", enum: ["production_started", "qc_pass", "shipped"], description: "Milestone that triggers release" },
                verified_by: { type: "string", description: "ID of verifier (buyer or admin)" },
              },
            },
            example: { milestone: "production_started", verified_by: "buyer-123" },
          }},
        },
        responses: {
          200: {
            description: "Escrow partially released",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                escrow_status: { type: "string" },
                escrow_event: { $ref: "#/components/schemas/EscrowEvent" },
                stripe_capture: {
                  type: "object",
                  nullable: true,
                  properties: {
                    capture_pct: { type: "number" },
                    capture_amount_usd: { type: "number" },
                    status: { type: "string" },
                  },
                },
                escrow_provider: { type: "string", enum: ["stripe"] },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Order not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: {
            description: "Prerequisites not met",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                error: { type: "string" },
                escrow_status: { type: "string" },
                milestone: { type: "string" },
              },
            }}},
          },
        },
      },
    },
    "/orders/{id}/release-escrow": {
      post: {
        tags: [tag.escrow],
        summary: "Release final escrow (buyer confirms receipt)",
        operationId: "releaseEscrow",
        description: "Buyer confirms receipt — validates milestone prerequisites, releases final escrow to factory via Stripe, and transitions order to 'delivered'. Funds are paid to factory within 2 business days.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Escrow released",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                order_id: { type: "string" },
                status: { type: "string" },
                payment_intent_id: { type: "string" },
                escrow_provider: { type: "string", enum: ["stripe"] },
                escrow_event: { $ref: "#/components/schemas/EscrowEvent" },
                message: { type: "string" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Prerequisites not met", content: { "application/json": { schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              escrow_status: { type: "string" },
            },
          }}}},
        },
      },
    },
    "/orders/{id}/escrow-events": {
      get: {
        tags: [tag.escrow],
        summary: "Full escrow audit trail",
        operationId: "getEscrowEvents",
        description: "Returns the complete escrow audit trail for an order, including all state transitions, amounts, and notes.",
        parameters: [idParam],
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
        description: "Admin manually transitions escrow state. Use with caution — bypasses normal milestone-gated workflow.",
        parameters: [idParam],
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
        parameters: [idParam],
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
        description: "Raise a dispute on an order. Transitions escrow to 'disputed' state.",
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["raised_by", "reason"],
              properties: {
                raised_by: { type: "string", enum: ["buyer", "factory", "platform"] },
                reason: { type: "string" },
                evidence_urls: { type: "array", items: { type: "string", format: "uri" } },
              },
            },
            example: { raised_by: "buyer", reason: "Product quality does not match sample", evidence_urls: ["https://example.com/photo1.jpg"] },
          }},
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
        description: "Platform admin resolves a dispute. Options: refund_full, refund_partial, rejected.",
        parameters: [idParam],
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
        description: "Receives Stripe events with signature verification. Updates escrow_status and escrow_events in DB on payment confirmation.",
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
              properties: {
                received: { type: "boolean" },
                result: { type: "object" },
                event_type: { type: "string" },
              },
            }}},
          },
          401: { description: "Invalid signature", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Onboarding ────────────────────────────────────────────
    "/onboard": {
      post: {
        tags: [tag.factories],
        summary: "Submit factory application",
        operationId: "submitApplication",
        description: "Submit a factory application with USCC validation, business details, and contact info. Requires a valid 18-character USCC with correct checksum.",
        requestBody: {
          required: true,
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["name_en", "uscc"],
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
                uscc: { type: "string", pattern: "^[0-9A-HJ-NP-RTUW]{2}\\d{6}[0-9A-HJ-NP-RTUW]{10}$" },
                legal_rep: { type: "string" },
                business_license_expiry: { type: "string", format: "date" },
                lat: { type: "number" },
                lng: { type: "number" },
              },
            },
            example: {
              name_en: "Shenzhen FastCharge Tech",
              name_zh: "深圳快充科技",
              categories: ["electronics_accessories", "cable_assembly"],
              moq: 500,
              uscc: "91440300MA5EYNJ69B",
              legal_rep: "Zhang Wei",
            },
          }},
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
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Admin ─────────────────────────────────────────────────
    "/admin/applications": {
      get: {
        tags: [tag.admin],
        summary: "List factory applications",
        operationId: "listApplications",
        security: [bearerAuth],
        description: "Admin-only endpoint to list all factory applications. Filter by status.",
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
          403: { description: "Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/admin/applications/{id}/approve": {
      post: {
        tags: [tag.admin],
        summary: "Approve factory application",
        operationId: "approveApplication",
        security: [bearerAuth],
        description: "Admin approves a factory application and creates the factory record with identity fields.",
        parameters: [idParam],
        responses: {
          200: {
            description: "Application approved",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                approved: { type: "boolean" },
                factory_id: { type: "string" },
                message: { type: "string" },
              },
            }}},
          },
          403: { description: "Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Application not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/admin/api-keys": {
      post: {
        tags: [tag.admin],
        summary: "Generate API key for AI agent partner",
        operationId: "generateApiKey",
        security: [bearerAuth],
        description: "Admin generates a new API key for an AI agent partner with specified permissions and rate limits.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["partner_name"],
            properties: {
              partner_name: { type: "string" },
              permissions: { type: "array", items: { type: "string" } },
              rate_limit_per_min: { type: "integer", default: 60 },
            },
          }}},
        },
        responses: {
          201: {
            description: "API key generated",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                key: { type: "string", description: "Store securely. Will not be shown again." },
                partner_name: { type: "string" },
                permissions: { type: "array", items: { type: "string" } },
                rate_limit_per_min: { type: "integer" },
                warning: { type: "string" },
              },
            }}},
          },
          400: { description: "Missing partner_name", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/admin/factory-auth/link": {
      post: {
        tags: [tag.admin],
        summary: "Link factory to WeChat or phone auth",
        operationId: "linkFactoryAuth",
        security: [bearerAuth],
        description: "Admin links a factory to WeChat openid or phone number for alternative authentication.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["factory_id", "method", "identifier"],
            properties: {
              factory_id: { type: "string" },
              method: { type: "string", enum: ["wechat", "phone"] },
              identifier: { type: "string", description: "WeChat openid or phone number" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Auth linked",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                linked: { type: "boolean" },
                factory_id: { type: "string" },
                method: { type: "string" },
              },
            }}},
          },
          400: { description: "Missing fields or invalid method", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Admin only", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
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
                token: { type: "string", description: "JWT token" },
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
                token: { type: "string", description: "JWT token" },
              },
            }}},
          },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/factory/wechat": {
      post: {
        tags: [tag.auth],
        summary: "WeChat OAuth login for factory operators",
        operationId: "loginFactoryWechat",
        description: "Login as a factory operator using WeChat openid. Factory must be linked via /admin/factory-auth/link first.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["openid"],
            properties: {
              openid: { type: "string", description: "WeChat openid" },
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
                factory_id: { type: "string" },
                token: { type: "string" },
                auth_method: { type: "string", enum: ["wechat"] },
              },
            }}},
          },
          401: { description: "Auth failed", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not linked to WeChat", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/factory/phone/code": {
      post: {
        tags: [tag.auth],
        summary: "Request SMS verification code",
        operationId: "requestPhoneCode",
        description: "Send an SMS verification code to a factory operator's phone number.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["phone"],
            properties: {
              phone: { type: "string", description: "Phone number" },
            },
          }}},
        },
        responses: {
          200: {
            description: "Code sent",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                sent: { type: "boolean" },
                phone: { type: "string" },
                expires_in_seconds: { type: "integer" },
              },
            }}},
          },
          400: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/factory/phone": {
      post: {
        tags: [tag.auth],
        summary: "Verify SMS code and login",
        operationId: "loginFactoryPhone",
        description: "Verify SMS verification code and login as factory operator.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["phone", "sms_code"],
            properties: {
              phone: { type: "string" },
              sms_code: { type: "string" },
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
                factory_id: { type: "string" },
                token: { type: "string" },
                auth_method: { type: "string", enum: ["phone"] },
              },
            }}},
          },
          401: { description: "Invalid or expired code", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Factory not linked to phone", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── WeChat & Testing ─────────────────────────────────────
    "/factory/quick-reply": {
      get: {
        tags: [tag.platform],
        summary: "WeChat magic link redirect",
        operationId: "quickReply",
        description: "Redirects from WeChat notification to factory-mobile.html with factory context.",
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
        description: "Sends a test WeChat notification to a factory for debugging webhook setup.",
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
