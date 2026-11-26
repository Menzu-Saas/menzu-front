// Friendly aliases over the generated Supabase types (src/lib/supabase/database.types.ts).
// Regenerate the generated file with the Supabase MCP `generate_typescript_types` after schema changes.
import type { Database } from "./supabase/database.types";

export type { Database, Json } from "./supabase/database.types";
export type { OrderStatus, OrderType, MemberRole } from "./order-status";

type PublicSchema = Database["public"];
type Tables = PublicSchema["Tables"];
type Enums = PublicSchema["Enums"];

/** Row type of a public table. */
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];
/** Insert type of a public table. */
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];
/** Update type of a public table. */
export type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];

export type PaymentMethod = Enums["payment_method"];
export type PaymentStatus = Enums["payment_status"];
export type RestaurantStatus = Enums["restaurant_status"];
export type CouponType = Enums["coupon_type"];
export type DeliveryZoneType = Enums["delivery_zone_type"];
export type ProductStatus = Enums["product_status"];

export type Profile = TableRow<"profiles">;
export type Restaurant = TableRow<"restaurants">;
export type RestaurantMember = TableRow<"restaurant_members">;
export type TeamInvite = TableRow<"team_invites">;
export type OpeningHour = TableRow<"opening_hours">;
export type Menu = TableRow<"menus">;
export type Category = TableRow<"categories">;
export type Product = TableRow<"products">;
export type ProductVariant = TableRow<"product_variants">;
export type AddonGroup = TableRow<"addon_groups">;
export type AddonOption = TableRow<"addon_options">;
export type ProductAddonGroup = TableRow<"product_addon_groups">;
export type DeliveryZone = TableRow<"delivery_zones">;
export type RestaurantTable = TableRow<"restaurant_tables">;
export type Customer = TableRow<"customers">;
export type CustomerAddress = TableRow<"customer_addresses">;
export type Coupon = TableRow<"coupons">;
export type Order = TableRow<"orders">;
export type OrderItem = TableRow<"order_items">;
export type OrderItemAddon = TableRow<"order_item_addons">;
export type OrderStatusHistory = TableRow<"order_status_history">;
export type Payment = TableRow<"payments">;
export type AuditLog = TableRow<"audit_logs">;

// Compile-time parity: the UI enums in order-status.ts must match the database enums.
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
export type EnumParityChecks = [
  Expect<IsEqual<import("./order-status").OrderStatus, Enums["order_status"]>>,
  Expect<IsEqual<import("./order-status").OrderType, Enums["order_type"]>>,
  Expect<IsEqual<import("./order-status").MemberRole, Enums["member_role"]>>,
];
