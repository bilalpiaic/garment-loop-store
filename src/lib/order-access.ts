import { timingSafeEqual } from "node:crypto";
import type { Order } from "@/lib/order-model";
import { getCustomerSession, getOrder, requireAdmin } from "@/lib/platform";

function safeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function tokensMatch(expected: string | undefined, provided: string | undefined) {
  if (!expected || !provided) return false;
  return safeEqualText(expected, provided);
}

export function emailsMatch(expected: string | undefined, provided: string | undefined) {
  if (!expected || !provided) return false;
  return safeEqualText(expected.trim().toLowerCase(), provided.trim().toLowerCase());
}

/** Strip secrets before returning an authorized order to a client. */
export function publicOrderView(order: Order): Omit<Order, "accessToken"> {
  const { accessToken, ...rest } = order;
  void accessToken;
  return rest;
}

export type OrderAccessSource = "token" | "email" | "customer" | "admin";

export async function authorizeOrderAccess(
  orderNumber: string,
  opts: { token?: string | null; email?: string | null } = {},
): Promise<{ ok: true; order: Order; source: OrderAccessSource } | { ok: false }> {
  const order = await getOrder(orderNumber);
  if (!order) return { ok: false };

  if (tokensMatch(order.accessToken, opts.token ?? undefined)) {
    return { ok: true, order, source: "token" };
  }

  if (emailsMatch(order.customer.email, opts.email ?? undefined)) {
    return { ok: true, order, source: "email" };
  }

  const session = await getCustomerSession();
  if (session) {
    const owns =
      order.customerId === session.customer.id ||
      emailsMatch(order.customer.email, session.customer.email);
    if (owns) return { ok: true, order, source: "customer" };
  }

  try {
    await requireAdmin("orders.view");
    return { ok: true, order, source: "admin" };
  } catch {
    /* not admin */
  }

  return { ok: false };
}

export { orderAccessPath } from "@/lib/order-model";
