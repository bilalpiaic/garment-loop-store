import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { CheckoutCustomer, OrderLine } from "@/lib/order-model";

export const inventory = pgTable("inventory", {
  variantId: text("variant_id").primaryKey(),
  stock: integer("stock").notNull(),
});

export const orders = pgTable("orders", {
  orderNumber: text("order_number").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  customerId: text("customer_id"),
  customer: jsonb("customer").$type<CheckoutCustomer>().notNull(),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  subtotalPkr: integer("subtotal_pkr").notNull(),
  shippingPkr: integer("shipping_pkr").notNull(),
  taxPkr: integer("tax_pkr").notNull().default(0),
  discountPkr: integer("discount_pkr").notNull().default(0),
  totalPkr: integer("total_pkr").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  status: text("status").notNull(),
  currency: text("currency").notNull(),
  shippingMethodId: text("shipping_method_id"),
  shippingLabel: text("shipping_label"),
  trackingNumber: text("tracking_number"),
  courier: text("courier"),
  notes: text("notes"),
  discountCode: text("discount_code"),
  stripeSessionId: text("stripe_session_id"),
});

export const platformState = pgTable("platform_state", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
