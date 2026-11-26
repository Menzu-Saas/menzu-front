import type { CouponLike } from "@/lib/schemas/coupon";

export interface CouponRow extends CouponLike {
  id: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface CouponPerformance {
  orders: number;
  discount_cents: number;
  revenue_cents: number;
}
