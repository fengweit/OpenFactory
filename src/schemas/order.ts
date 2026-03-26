import { z } from "zod";

export const EscrowStatusEnum = z.enum([
  "pending_deposit",
  "deposit_held",
  "production_released",
  "final_released",
  "disputed",
  "refunded",
]);

export type EscrowStatus = z.infer<typeof EscrowStatusEnum>;

export const OrderSchema = z.object({
  order_id: z.string(),
  quote_id: z.string(),
  factory_id: z.string(),
  buyer_id: z.string(),
  status: z.enum([
    "pending",
    "confirmed",
    "in_production",
    "qc",
    "shipped",
    "delivered",
    "disputed",
  ]),
  quantity: z.number(),
  unit_price_usd: z.number(),
  total_price_usd: z.number(),
  escrow_held: z.boolean(),
  escrow_status: EscrowStatusEnum,
  created_at: z.string(),
  estimated_ship_date: z.string(),
  tracking: z.string().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderStatus = Order["status"];
