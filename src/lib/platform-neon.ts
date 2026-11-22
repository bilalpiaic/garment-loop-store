import { databaseUrl, getDb, getSql } from "@/db/client";
import { ensureDatabase } from "@/db/migrate";
import { inventory, orders } from "@/db/schema";
import { categories, collections, products } from "@/lib/catalog";
import { DEFAULT_SETTINGS } from "@/lib/identity";
import { withLock } from "@/lib/lock";
import type { Order, PaymentMethod, PaymentStatus, OrderStatus } from "@/lib/order-model";
import { desc } from "drizzle-orm";
import {
  emptyPlatformState,
  type PlatformState,
} from "@/lib/platform-state";

function seedCatalog() {
  return {
    products: products.map((product) => ({
      ...product,
      status: product.status ?? ("published" as const),
      variants: product.variants.map((variant) => ({ ...variant })),
    })),
    categories: categories.map((item) => ({ ...item })),
    collections: collections.map((item) => ({ ...item })),
  };
}

type StoredMeta = Omit<PlatformState, "orders" | "stock" | "orderSeq">;

function rowToOrder(row: typeof orders.$inferSelect): Order {
  return {
    orderNumber: row.orderNumber,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt
      ? row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : new Date(row.updatedAt).toISOString()
      : undefined,
    customerId: row.customerId ?? undefined,
    customer: row.customer,
    items: row.items,
    subtotalPkr: row.subtotalPkr,
    shippingPkr: row.shippingPkr,
    taxPkr: row.taxPkr ?? undefined,
    discountPkr: row.discountPkr ?? undefined,
    totalPkr: row.totalPkr,
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentStatus: row.paymentStatus as PaymentStatus,
    status: row.status as OrderStatus,
    currency: row.currency as "PKR" | "USD",
    shippingMethodId: row.shippingMethodId ?? undefined,
    shippingLabel: row.shippingLabel ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    courier: row.courier ?? undefined,
    notes: row.notes ?? undefined,
    discountCode: row.discountCode ?? undefined,
    stripeSessionId: row.stripeSessionId ?? undefined,
  };
}

export async function loadNeonState(): Promise<PlatformState> {
  await ensureDatabase();
  const sql = getSql();
  const db = getDb();
  const base = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  if (!sql || !db) {
    return base;
  }

  const metaRows = await sql`SELECT data FROM platform_state WHERE id = 'default' LIMIT 1`;
  const raw = (metaRows[0] as { data?: StoredMeta } | undefined)?.data;
  const meta: StoredMeta = {
    version: 2,
    catalog: raw?.catalog ?? base.catalog,
    customers: raw?.customers ?? [],
    addresses: raw?.addresses ?? [],
    adminUsers: raw?.adminUsers ?? [],
    sessions: raw?.sessions ?? [],
    otp: raw?.otp ?? [],
    discounts: raw?.discounts ?? [],
    inventoryMovements: raw?.inventoryMovements ?? [],
    settings: { ...DEFAULT_SETTINGS, ...raw?.settings },
    reviews: raw?.reviews?.length ? raw.reviews : base.reviews,
    returns: raw?.returns ?? [],
    wishlists: raw?.wishlists ?? {},
    pages: raw?.pages?.length ? raw.pages : base.pages,
    auditLogs: raw?.auditLogs ?? [],
    mfaChallenges: raw?.mfaChallenges ?? [],
  };

  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const inventoryRows = await db.select().from(inventory);
  const stock: Record<string, number> = { ...base.stock };
  for (const row of inventoryRows) {
    stock[row.variantId] = row.stock;
  }

  return {
    ...meta,
    stock,
    orders: orderRows.map(rowToOrder),
    orderSeq: orderRows.length,
  };
}

export async function saveNeonState(state: PlatformState) {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not set.");
  }
  const meta: StoredMeta = {
    version: 2,
    catalog: state.catalog,
    customers: state.customers,
    addresses: state.addresses,
    adminUsers: state.adminUsers,
    sessions: state.sessions,
    otp: state.otp,
    discounts: state.discounts,
    inventoryMovements: state.inventoryMovements,
    settings: state.settings,
    reviews: state.reviews,
    returns: state.returns,
    wishlists: state.wishlists,
    pages: state.pages ?? [],
    auditLogs: state.auditLogs ?? [],
    mfaChallenges: state.mfaChallenges ?? [],
  };
  const payload = JSON.stringify(meta);
  await sql`
    INSERT INTO platform_state (id, data, updated_at)
    VALUES ('default', ${payload}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;

  for (const [variantId, stock] of Object.entries(state.stock)) {
    await sql`
      INSERT INTO inventory (variant_id, stock)
      VALUES (${variantId}, ${stock})
      ON CONFLICT (variant_id) DO UPDATE SET stock = EXCLUDED.stock
    `;
  }

  for (const order of state.orders) {
    await sql`
      INSERT INTO orders (
        order_number, created_at, updated_at, customer_id, customer, items,
        subtotal_pkr, shipping_pkr, tax_pkr, discount_pkr, total_pkr,
        payment_method, payment_status, status, currency,
        shipping_method_id, shipping_label,
        tracking_number, courier, notes, discount_code, stripe_session_id
      ) VALUES (
        ${order.orderNumber},
        ${order.createdAt}::timestamptz,
        ${order.updatedAt ?? order.createdAt}::timestamptz,
        ${order.customerId ?? null},
        ${JSON.stringify(order.customer)}::jsonb,
        ${JSON.stringify(order.items)}::jsonb,
        ${order.subtotalPkr},
        ${order.shippingPkr},
        ${order.taxPkr ?? 0},
        ${order.discountPkr ?? 0},
        ${order.totalPkr},
        ${order.paymentMethod},
        ${order.paymentStatus},
        ${order.status},
        ${order.currency},
        ${order.shippingMethodId ?? null},
        ${order.shippingLabel ?? null},
        ${order.trackingNumber ?? null},
        ${order.courier ?? null},
        ${order.notes ?? null},
        ${order.discountCode ?? null},
        ${order.stripeSessionId ?? null}
      )
      ON CONFLICT (order_number) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        customer_id = EXCLUDED.customer_id,
        customer = EXCLUDED.customer,
        items = EXCLUDED.items,
        subtotal_pkr = EXCLUDED.subtotal_pkr,
        shipping_pkr = EXCLUDED.shipping_pkr,
        tax_pkr = EXCLUDED.tax_pkr,
        discount_pkr = EXCLUDED.discount_pkr,
        total_pkr = EXCLUDED.total_pkr,
        payment_method = EXCLUDED.payment_method,
        payment_status = EXCLUDED.payment_status,
        status = EXCLUDED.status,
        currency = EXCLUDED.currency,
        shipping_method_id = EXCLUDED.shipping_method_id,
        shipping_label = EXCLUDED.shipping_label,
        tracking_number = EXCLUDED.tracking_number,
        courier = EXCLUDED.courier,
        notes = EXCLUDED.notes,
        discount_code = EXCLUDED.discount_code,
        stripe_session_id = EXCLUDED.stripe_session_id
    `;
  }
}

export async function withNeonState<T>(
  fn: (state: PlatformState) => Promise<T> | T,
  options?: { persist?: boolean },
): Promise<T> {
  return withLock("neon-platform", async () => {
    const state = await loadNeonState();
    const result = await fn(state);
    if (options?.persist !== false) {
      await saveNeonState(state);
    }
    return result;
  });
}

export function neonAvailable() {
  return Boolean(databaseUrl());
}
