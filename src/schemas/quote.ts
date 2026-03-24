import { z } from "zod";

export const QuoteRequestSchema = z.object({
  factory_id: z.string(),
  product_description: z.string(),
  quantity: z.number(),
  buyer_id: z.string().optional(),
  target_price_usd: z.number().optional(),
  deadline_days: z.number().optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
});

export const QuoteResponseSchema = z.object({
  quote_id: z.string(),
  factory_id: z.string(),
  unit_price_usd: z.number(),
  total_price_usd: z.number(),
  lead_time_days: z.number(),
  moq: z.number(),
  valid_until: z.string(),
  notes: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
