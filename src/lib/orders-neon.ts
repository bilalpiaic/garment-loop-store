import { desc, eq } from "drizzle-orm";
import { getDb, getDialect, getMysqlPool, getSql } from "@/db/client";
import { ensureDatabase } from "@/db/migrate";
import { inventory as pgInventory, orders as pgOrders } from "@/db/schema";
import {
  inventory as mysqlInventory,
  orders as mysqlOrders,
} from "@/db/schema-mysql";
import { getVariant } from "@/lib/catalog";
import { shippingCostPkr } from "@/lib/money";
import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/order-model";

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
  customer: unknown;
  items: unknown;
  subtotalPkr?: number;
  subtotal_pkr?: number;
  shippingPkr?: number;
  shipping_pkr?: number;
  totalPkr?: number;
  total_pkr?: number;
  paymentMethod?: string;
  payment_method?: string;
  paymentStatus?: string;
  payment_status?: string;
  status: string;
  currency: string;
}): Order {
  const createdAt = row.createdAt ?? row.created_at!;
  return {
    orderNumber: row.orderNumber ?? row.order_number!,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : new Date(createdAt).toISOString(),
    customer: parseJson(row.customer, {} as Order["customer"]),
    items: parseJson(row.items, [] as Order["items"]),
    subtotalPkr: row.subtotalPkr ?? row.subtotal_pkr!,
    shippingPkr: row.shippingPkr ?? row.shipping_pkr!,
    totalPkr: row.totalPkr ?? row.total_pkr!,
    paymentMethod: (row.paymentMethod ?? row.payment_method) as PaymentMethod,
    paymentStatus: (row.paymentStatus ?? row.payment_status) as PaymentStatus,
    status: row.status as OrderStatus,
    currency: row.currency as "PKR" | "USD",
  };
}

function buildLines(
  items: CheckoutItem[],
): { ok: true; lines: OrderLine[] } | { ok: false; error: string } {
  if (items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const lines: OrderLine[] = [];
  for (const item of items) {
    if (item.quantity < 1) {
      return { ok: false, error: "Invalid quantity." };
    }
    const match = getVariant(item.variantId);
    if (!match) {
      return { ok: false, error: "One of the items is no longer available." };
    }
    const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
    lines.push({
      variantId: match.variant.id,
      productId: match.product.id,
      productTitle: match.product.title,
      slug: match.product.slug,
      color: match.variant.color,
      size: match.variant.size,
      image: match.product.images[0]?.src ?? "",
      quantity: item.quantity,
      unitPricePkr: unit,
      totalPkr: unit * item.quantity,
    });
  }
  return { ok: true, lines };
}

export async function getStock(variantId: string) {
  await ensureDatabase();
  const db = getDb();
  if (!db) {
    return getVariant(variantId)?.variant.stock ?? 0;
  }
  if (getDialect() === "mysql") {
    const [row] = await (db as import("@/db/client").MysqlDatabase)
      .select()
      .from(mysqlInventory)
      .where(eq(mysqlInventory.variantId, variantId))
      .limit(1);
    return row?.stock ?? getVariant(variantId)?.variant.stock ?? 0;
  }
  const [row] = await (db as import("@/db/client").PgDatabase)
    .select()
    .from(pgInventory)
    .where(eq(pgInventory.variantId, variantId))
    .limit(1);
  return row?.stock ?? getVariant(variantId)?.variant.stock ?? 0;
}

export async function getOrder(orderNumber: string) {
  await ensureDatabase();
  const db = getDb();
  if (!db) {
    return undefined;
  }
  if (getDialect() === "mysql") {
    const [row] = await (db as import("@/db/client").MysqlDatabase)
      .select()
      .from(mysqlOrders)
      .where(eq(mysqlOrders.orderNumber, orderNumber.toUpperCase()))
      .limit(1);
    return row ? rowToOrder(row) : undefined;
  }
  const [row] = await (db as import("@/db/client").PgDatabase)
    .select()
    .from(pgOrders)
    .where(eq(pgOrders.orderNumber, orderNumber.toUpperCase()))
    .limit(1);
  return row ? rowToOrder(row) : undefined;
}

export async function listOrders() {
  await ensureDatabase();
  const db = getDb();
  if (!db) {
    return [];
  }
  if (getDialect() === "mysql") {
    const rows = await (db as import("@/db/client").MysqlDatabase)
      .select()
      .from(mysqlOrders)
      .orderBy(desc(mysqlOrders.createdAt));
    return rows.map(rowToOrder);
  }
  const rows = await (db as import("@/db/client").PgDatabase)
    .select()
    .from(pgOrders)
    .orderBy(desc(pgOrders.createdAt));
  return rows.map(rowToOrder);
}

async function createMysqlOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
  lines: OrderLine[];
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotalPkr: number;
  shippingPkr: number;
  createdAt: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const pool = getMysqlPool();
  if (!pool) {
    return { ok: false, error: "DATABASE_URL is not set." };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const line of input.lines) {
      const [result] = await connection.query(
        `UPDATE inventory SET stock = stock - ? WHERE variant_id = ? AND stock >= ?`,
        [line.quantity, line.variantId, line.quantity],
      );
      const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
      if (affected === 0) {
        throw new Error(`out of stock: ${line.variantId}`);
      }
    }
    const [seqRows] = await connection.query(
      `SELECT next_val FROM order_number_seq WHERE id = 1 FOR UPDATE`,
    );
    const nextVal = (seqRows as Array<{ next_val: number }>)[0]?.next_val ?? 1;
    await connection.query(`UPDATE order_number_seq SET next_val = ? WHERE id = 1`, [
      nextVal + 1,
    ]);
    const orderNumber = `GL-${String(nextVal).padStart(4, "0")}`;
    const totalPkr = input.subtotalPkr + input.shippingPkr;
    await connection.query(
      `INSERT INTO orders (
        order_number, created_at, customer, items,
        subtotal_pkr, shipping_pkr, total_pkr,
        payment_method, payment_status, status, currency
      ) VALUES (?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        new Date(input.createdAt),
        JSON.stringify(input.customer),
        JSON.stringify(input.lines),
        input.subtotalPkr,
        input.shippingPkr,
        totalPkr,
        input.paymentMethod,
        input.paymentStatus,
        input.status,
        input.currency,
      ],
    );
    await connection.commit();
    return {
      ok: true,
      order: {
        orderNumber,
        createdAt: input.createdAt,
        customer: input.customer,
        items: input.lines,
        subtotalPkr: input.subtotalPkr,
        shippingPkr: input.shippingPkr,
        totalPkr,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        status: input.status,
        currency: input.currency,
      },
    };
  } catch (error) {
    await connection.rollback();
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("out of stock")) {
      const variantId = message.split("out of stock:")[1]?.trim();
      const match = variantId ? getVariant(variantId) : null;
      if (match) {
        return {
          ok: false,
          error: `${match.product.title} (${match.variant.color}, ${match.variant.size}) is out of stock.`,
        };
      }
      return { ok: false, error: "One of the items is out of stock." };
    }
    console.error("MySQL checkout failed", error);
    return { ok: false, error: "Could not place the order. Please try again." };
  } finally {
    connection.release();
  }
}

export async function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  const built = buildLines(input.items);
  if (!built.ok) {
    return built;
  }

  await ensureDatabase();

  const paymentStatus: PaymentStatus =
    input.paymentMethod === "card_demo" ? "paid" : "pending";
  const status: OrderStatus =
    input.paymentMethod === "cod" || input.paymentMethod === "card_demo"
      ? "confirmed"
      : "pending";
  const subtotalPkr = built.lines.reduce((sum, line) => sum + line.totalPkr, 0);
  const shippingPkr = shippingCostPkr(subtotalPkr, input.customer.country);
  const createdAt = new Date().toISOString();

  if (getDialect() === "mysql") {
    return createMysqlOrder({
      ...input,
      lines: built.lines,
      paymentStatus,
      status,
      subtotalPkr,
      shippingPkr,
      createdAt,
    });
  }

  const sql = getSql();
  if (!sql) {
    return { ok: false, error: "DATABASE_URL is not set." };
  }

  const payload = {
    createdAt,
    customer: input.customer,
    items: built.lines,
    subtotalPkr,
    shippingPkr,
    totalPkr: subtotalPkr + shippingPkr,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    status,
    currency: input.currency,
  };

  try {
    const rows = await sql`
      SELECT place_order(${JSON.stringify(payload)}::jsonb) AS order_number
    `;
    const orderNumber = (rows[0] as { order_number?: string } | undefined)?.order_number;
    if (!orderNumber) {
      return { ok: false, error: "Could not create the order. Please try again." };
    }
    return {
      ok: true,
      order: {
        ...payload,
        orderNumber,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("out of stock")) {
      const variantId = message.split("out of stock:")[1]?.trim();
      const match = variantId ? getVariant(variantId) : null;
      if (match) {
        return {
          ok: false,
          error: `${match.product.title} (${match.variant.color}, ${match.variant.size}) is out of stock.`,
        };
      }
      return { ok: false, error: "One of the items is out of stock." };
    }
    console.error("Neon checkout failed", error);
    return { ok: false, error: "Could not place the order. Please try again." };
  }
}
