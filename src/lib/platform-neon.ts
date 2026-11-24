import {
  databaseAvailable,
  getDb,
  getDialect,
  getMysqlPool,
  getSql,
} from "@/db/client";
import { ensureDatabase } from "@/db/migrate";
import { inventory as pgInventory, orders as pgOrders } from "@/db/schema";
import {
  inventory as mysqlInventory,
  orders as mysqlOrders,
} from "@/db/schema-mysql";
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

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function rowToOrder(row: {
  orderNumber?: string;
  order_number?: string;
  createdAt?: Date | string;
  created_at?: Date | string;
  updatedAt?: Date | string | null;
  updated_at?: Date | string | null;
  customerId?: string | null;
  customer_id?: string | null;
  customer: unknown;
  items: unknown;
  subtotalPkr?: number;
  subtotal_pkr?: number;
  shippingPkr?: number;
  shipping_pkr?: number;
  taxPkr?: number | null;
  tax_pkr?: number | null;
  discountPkr?: number | null;
  discount_pkr?: number | null;
  totalPkr?: number;
  total_pkr?: number;
  paymentMethod?: string;
  payment_method?: string;
  paymentStatus?: string;
  payment_status?: string;
  status: string;
  currency: string;
  shippingMethodId?: string | null;
  shipping_method_id?: string | null;
  shippingLabel?: string | null;
  shipping_label?: string | null;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  courier?: string | null;
  notes?: string | null;
  discountCode?: string | null;
  discount_code?: string | null;
  stripeSessionId?: string | null;
  stripe_session_id?: string | null;
}): Order {
  const createdAt = row.createdAt ?? row.created_at!;
  const updatedAt = row.updatedAt ?? row.updated_at;
  return {
    orderNumber: row.orderNumber ?? row.order_number!,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : new Date(createdAt).toISOString(),
    updatedAt: updatedAt
      ? updatedAt instanceof Date
        ? updatedAt.toISOString()
        : new Date(updatedAt).toISOString()
      : undefined,
    customerId: (row.customerId ?? row.customer_id) ?? undefined,
    customer: parseJson(row.customer, {} as Order["customer"]),
    items: parseJson(row.items, [] as Order["items"]),
    subtotalPkr: row.subtotalPkr ?? row.subtotal_pkr!,
    shippingPkr: row.shippingPkr ?? row.shipping_pkr!,
    taxPkr: (row.taxPkr ?? row.tax_pkr) ?? undefined,
    discountPkr: (row.discountPkr ?? row.discount_pkr) ?? undefined,
    totalPkr: row.totalPkr ?? row.total_pkr!,
    paymentMethod: (row.paymentMethod ?? row.payment_method) as PaymentMethod,
    paymentStatus: (row.paymentStatus ?? row.payment_status) as PaymentStatus,
    status: row.status as OrderStatus,
    currency: row.currency as "PKR" | "USD",
    shippingMethodId: (row.shippingMethodId ?? row.shipping_method_id) ?? undefined,
    shippingLabel: (row.shippingLabel ?? row.shipping_label) ?? undefined,
    trackingNumber: (row.trackingNumber ?? row.tracking_number) ?? undefined,
    courier: row.courier ?? undefined,
    notes: row.notes ?? undefined,
    discountCode: (row.discountCode ?? row.discount_code) ?? undefined,
    stripeSessionId: (row.stripeSessionId ?? row.stripe_session_id) ?? undefined,
  };
}

function buildMeta(raw: Partial<StoredMeta> | undefined, base: PlatformState): StoredMeta {
  return {
    version: 3,
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
    takeBacks: raw?.takeBacks ?? [],
    repairs: raw?.repairs ?? [],
    circularSubscriptions: raw?.circularSubscriptions ?? [],
    wishlists: raw?.wishlists ?? {},
    pages: raw?.pages?.length ? raw.pages : base.pages,
    auditLogs: raw?.auditLogs ?? [],
    mfaChallenges: raw?.mfaChallenges ?? [],
  };
}

async function loadPostgresState(): Promise<PlatformState> {
  await ensureDatabase();
  const sql = getSql();
  const db = getDb();
  const base = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  if (!sql || !db) {
    return base;
  }

  const metaRows = await sql`SELECT data FROM platform_state WHERE id = 'default' LIMIT 1`;
  const raw = (metaRows[0] as { data?: StoredMeta } | undefined)?.data;
  const meta = buildMeta(raw, base);

  const orderRows = await (db as import("@/db/client").PgDatabase)
    .select()
    .from(pgOrders)
    .orderBy(desc(pgOrders.createdAt));
  const inventoryRows = await (db as import("@/db/client").PgDatabase)
    .select()
    .from(pgInventory);
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

async function loadMysqlState(): Promise<PlatformState> {
  await ensureDatabase();
  const pool = getMysqlPool();
  const db = getDb();
  const base = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  if (!pool || !db) {
    return base;
  }

  const [metaRows] = await pool.query(
    `SELECT data FROM platform_state WHERE id = 'default' LIMIT 1`,
  );
  const metaRow = (metaRows as Array<{ data: unknown }>)[0];
  const raw = parseJson<Partial<StoredMeta> | undefined>(metaRow?.data, undefined);
  const meta = buildMeta(raw, base);

  const orderRows = await (db as import("@/db/client").MysqlDatabase)
    .select()
    .from(mysqlOrders)
    .orderBy(desc(mysqlOrders.createdAt));
  const inventoryRows = await (db as import("@/db/client").MysqlDatabase)
    .select()
    .from(mysqlInventory);
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

export async function loadNeonState(): Promise<PlatformState> {
  if (getDialect() === "mysql") {
    return loadMysqlState();
  }
  return loadPostgresState();
}

async function savePostgresState(state: PlatformState) {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not set.");
  }
  const meta: StoredMeta = {
    version: 3,
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
    takeBacks: state.takeBacks ?? [],
    repairs: state.repairs ?? [],
    circularSubscriptions: state.circularSubscriptions ?? [],
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

async function saveMysqlState(state: PlatformState) {
  const pool = getMysqlPool();
  if (!pool) {
    throw new Error("MySQL DATABASE_URL or MYSQL_* is not set.");
  }
  const meta: StoredMeta = {
    version: 3,
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
    takeBacks: state.takeBacks ?? [],
    repairs: state.repairs ?? [],
    circularSubscriptions: state.circularSubscriptions ?? [],
    wishlists: state.wishlists,
    pages: state.pages ?? [],
    auditLogs: state.auditLogs ?? [],
    mfaChallenges: state.mfaChallenges ?? [],
  };
  const payload = JSON.stringify(meta);
  await pool.query(
    `INSERT INTO platform_state (id, data, updated_at)
     VALUES ('default', CAST(? AS JSON), CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
    [payload],
  );

  for (const [variantId, stock] of Object.entries(state.stock)) {
    await pool.query(
      `INSERT INTO inventory (variant_id, stock) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
      [variantId, stock],
    );
  }

  for (const order of state.orders) {
    await pool.query(
      `INSERT INTO orders (
        order_number, created_at, updated_at, customer_id, customer, items,
        subtotal_pkr, shipping_pkr, tax_pkr, discount_pkr, total_pkr,
        payment_method, payment_status, status, currency,
        shipping_method_id, shipping_label,
        tracking_number, courier, notes, discount_code, stripe_session_id
      ) VALUES (?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        updated_at = VALUES(updated_at),
        customer_id = VALUES(customer_id),
        customer = VALUES(customer),
        items = VALUES(items),
        subtotal_pkr = VALUES(subtotal_pkr),
        shipping_pkr = VALUES(shipping_pkr),
        tax_pkr = VALUES(tax_pkr),
        discount_pkr = VALUES(discount_pkr),
        total_pkr = VALUES(total_pkr),
        payment_method = VALUES(payment_method),
        payment_status = VALUES(payment_status),
        status = VALUES(status),
        currency = VALUES(currency),
        shipping_method_id = VALUES(shipping_method_id),
        shipping_label = VALUES(shipping_label),
        tracking_number = VALUES(tracking_number),
        courier = VALUES(courier),
        notes = VALUES(notes),
        discount_code = VALUES(discount_code),
        stripe_session_id = VALUES(stripe_session_id)`,
      [
        order.orderNumber,
        new Date(order.createdAt),
        new Date(order.updatedAt ?? order.createdAt),
        order.customerId ?? null,
        JSON.stringify(order.customer),
        JSON.stringify(order.items),
        order.subtotalPkr,
        order.shippingPkr,
        order.taxPkr ?? 0,
        order.discountPkr ?? 0,
        order.totalPkr,
        order.paymentMethod,
        order.paymentStatus,
        order.status,
        order.currency,
        order.shippingMethodId ?? null,
        order.shippingLabel ?? null,
        order.trackingNumber ?? null,
        order.courier ?? null,
        order.notes ?? null,
        order.discountCode ?? null,
        order.stripeSessionId ?? null,
      ],
    );
  }
}

export async function saveNeonState(state: PlatformState) {
  if (getDialect() === "mysql") {
    await saveMysqlState(state);
    return;
  }
  await savePostgresState(state);
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

/** True when DATABASE_URL or MYSQL_* is configured (Postgres/Neon or MySQL). */
export function neonAvailable() {
  return databaseAvailable();
}
