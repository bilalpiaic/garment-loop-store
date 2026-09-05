import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { CheckoutCustomer, OrderLine } from "@/lib/order-model";

export const inventory = pgTable("inventory", {
  variantId: text("variant_id").primaryKey(),
  stock: integer("stock").notNull(),
});

export const orders = pgTable("orders", {
  orderNumber: text("order_number").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  customer: jsonb("customer").$type<CheckoutCustomer>().notNull(),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  subtotalPkr: integer("subtotal_pkr").notNull(),
  shippingPkr: integer("shipping_pkr").notNull(),
  totalPkr: integer("total_pkr").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull(),
  status: text("status").notNull(),
  currency: text("currency").notNull(),
});
