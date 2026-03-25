import { z } from "zod";

export const FactoryCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  name_zh: z.string(),
  location: z.object({
    city: z.string(),
    district: z.string(),
  }),
  categories: z.array(z.enum([
    "electronics_accessories",
    "pcb_assembly",
    "plastic_injection",
    "metal_enclosure",
    "cable_assembly",
  ])),
  moq: z.number(),
  lead_time_days: z.object({
    sample: z.number(),
    production: z.number(),
  }),
  certifications: z.array(z.string()),
  price_tier: z.enum(["budget", "mid", "premium"]),
  capacity_units_per_month: z.number(),
  accepts_foreign_buyers: z.boolean(),
  wechat_id: z.string().optional(),
  wechat_webhook_url: z.string().url().optional(),
  verified: z.boolean(),
  rating: z.number().min(0).max(5).optional(),
});

export type Factory = z.infer<typeof FactoryCapabilitySchema>;
export type FactoryCategory = Factory["categories"][number];
