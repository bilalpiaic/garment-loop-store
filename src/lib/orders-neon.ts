import { desc, eq } from "drizzle-orm";
import { getDb, getSql } from "@/db/client";
import { ensureDatabase } from "@/db/migrate";
import { inventory, orders } from "@/db/schema";
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

function rowToOrder(row: typeof orders.$inferSelect): Order {
  return {
    orderNumber: row.orderNumber,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    customer: row.customer,
    items: row.items,
    subtotalPkr: row.subtotalPkr,
    shippingPkr: row.shippingPkr,
    totalPkr: row.totalPkr,
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentStatus: row.paymentStatus as PaymentStatus,
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
  const [row] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .limit(1);
  return row?.stock ?? getVariant(variantId)?.variant.stock ?? 0;
}

export async function getOrder(orderNumber: string) {
  await ensureDatabase();
  const db = getDb();
  if (!db) {
    return undefined;
  }
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber.toUpperCase()))
    .limit(1);
  return row ? rowToOrder(row) : undefined;
}

export async function listOrders() {
  await ensureDatabase();
  const db = getDb();
  if (!db) {
    return [];
  }
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return rows.map(rowToOrder);
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
  const sql = getSql();
  if (!sql) {
    return { ok: false, error: "DATABASE_URL is not set." };
  }

  const paymentStatus: PaymentStatus =
    input.paymentMethod === "card_demo" ? "paid" : "pending";
  const status: OrderStatus =
    input.paymentMethod === "cod" || input.paymentMethod === "card_demo"
      ? "confirmed"
      : "pending";
  const subtotalPkr = built.lines.reduce((sum, line) => sum + line.totalPkr, 0);
  const shippingPkr = shippingCostPkr(subtotalPkr, input.customer.country);
  const createdAt = new Date().toISOString();
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
