import {
  int,
  json,
  mysqlTable,
  timestamp,
  varchar,
  text,
} from "drizzle-orm/mysql-core";
import type { CheckoutCustomer, OrderLine } from "@/lib/order-model";

export const inventory = mysqlTable("inventory", {
  variantId: varchar("variant_id", { length: 191 }).primaryKey(),
  stock: int("stock").notNull(),
});

export const orders = mysqlTable("orders", {
  orderNumber: varchar("order_number", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  customerId: varchar("customer_id", { length: 191 }),
  customer: json("customer").$type<CheckoutCustomer>().notNull(),
  items: json("items").$type<OrderLine[]>().notNull(),
  subtotalPkr: int("subtotal_pkr").notNull(),
  shippingPkr: int("shipping_pkr").notNull(),
  taxPkr: int("tax_pkr").notNull().default(0),
  discountPkr: int("discount_pkr").notNull().default(0),
  totalPkr: int("total_pkr").notNull(),
  paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 64 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull(),
  shippingMethodId: varchar("shipping_method_id", { length: 191 }),
  shippingLabel: text("shipping_label"),
  trackingNumber: varchar("tracking_number", { length: 191 }),
  courier: varchar("courier", { length: 191 }),
  notes: text("notes"),
  discountCode: varchar("discount_code", { length: 64 }),
  stripeSessionId: varchar("stripe_session_id", { length: 191 }),
});

export const platformState = mysqlTable("platform_state", {
  id: varchar("id", { length: 64 }).primaryKey(),
  data: json("data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
