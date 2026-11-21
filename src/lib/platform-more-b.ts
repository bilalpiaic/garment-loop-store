import {
  PlatformError,
  mutate,
  readPlatform,
} from "@/lib/platform-core";
import { cache } from "react";
import { cookies } from "next/headers";
import { hashPassword } from "@/lib/password";
import { createId } from "@/lib/ids";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  type AdminUser,
  type StoreSettings,
} from "@/lib/identity";
import { mergeStockIntoCatalog } from "@/lib/platform-state";
import { can, type Permission, type Role } from "@/lib/roles";
import { resolveShippingOption } from "@/lib/shipping";
import { sendOrderConfirmation } from "@/lib/email";

export const getCustomerSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return undefined;
  return readPlatform((state) => {
    const session = state.sessions.find(
      (item) => item.id === token && item.kind === "customer" && new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) return undefined;
    const customer = state.customers.find((item) => item.id === session.userId);
    if (!customer) return undefined;
    const addresses = state.addresses.filter((item) => item.customerId === customer.id);
    return { customer, addresses, session };
  });
});

export const getAdminSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return undefined;
  return readPlatform((state) => {
    const session = state.sessions.find(
      (item) => item.id === token && item.kind === "admin" && new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) return undefined;
    const user = state.adminUsers.find((item) => item.id === session.userId && item.active);
    if (!user) return undefined;
    return { user, session };
  });
});

export async function requireAdmin(permission?: Permission) {
  const session = await getAdminSession();
  if (!session) throw new PlatformError("Sign in required.", 401);
  if (permission && !can(session.user.role, permission)) {
    throw new PlatformError("You do not have access to this action.", 403);
  }
  return session;
}

export async function listAdminUsers() {
  return readPlatform((state) =>
    state.adminUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })),
  );
}

export async function saveAdminUser(input: {
  id?: string;
  email: string;
  name: string;
  role: Role;
  password?: string;
  active?: boolean;
  actorRole: Role;
}) {
  if (input.role === "owner" && input.actorRole !== "owner") {
    throw new PlatformError("Only the owner can assign the owner role.", 403);
  }
  return mutate(async (state) => {
    const email = input.email.trim().toLowerCase();
    if (input.id) {
      const user = state.adminUsers.find((item) => item.id === input.id);
      if (!user) throw new PlatformError("User not found.", 404);
      if (user.role === "owner" && input.actorRole !== "owner") {
        throw new PlatformError("The owner account cannot be edited.", 403);
      }
      user.email = email;
      user.name = input.name;
      user.role = input.role;
      if (input.active !== undefined) user.active = input.active;
      if (input.password) user.passwordHash = await hashPassword(input.password);
      return publicAdmin(user);
    }
    if (state.adminUsers.some((item) => item.email === email)) {
      throw new PlatformError("An account with that email already exists.");
    }
    if (!input.password) throw new PlatformError("Set an initial password.");
    const user: AdminUser = {
      id: createId("usr"),
      email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      active: input.active ?? true,
      createdAt: new Date().toISOString(),
    };
    state.adminUsers.push(user);
    return publicAdmin(user);
  });
}

function publicAdmin(user: AdminUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getDashboardMetrics() {
  return readPlatform((state) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayOrders = state.orders.filter((order) => order.createdAt >= start && order.status !== "cancelled");
    const revenueToday = todayOrders.reduce((sum, order) => sum + order.totalPkr, 0);
    const pending = state.orders.filter(
      (order) => order.status === "pending" || order.status === "confirmed" || order.status === "processing",
    );
    const catalog = mergeStockIntoCatalog(state);
    const lowStock = catalog.products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.stock <= state.settings.lowStockThreshold)
        .map((variant) => ({
          productTitle: product.title,
          variantId: variant.id,
          color: variant.color,
          size: variant.size,
          stock: variant.stock,
        })),
    );
    const counts = new Map<string, { title: string; quantity: number; revenue: number }>();
    for (const order of state.orders) {
      if (order.status === "cancelled") continue;
      for (const line of order.items) {
        const current = counts.get(line.productId) ?? { title: line.productTitle, quantity: 0, revenue: 0 };
        current.quantity += line.quantity;
        current.revenue += line.totalPkr;
        counts.set(line.productId, current);
      }
    }
    const topProducts = [...counts.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    return {
      ordersToday: todayOrders.length,
      revenueToday,
      pendingOrders: pending.length,
      lowStockCount: lowStock.length,
      lowStock,
      recentOrders: state.orders.slice(0, 8),
      topProducts,
      totalOrders: state.orders.length,
      totalCustomers: state.customers.length,
      publishedProducts: catalog.products.filter((product) => product.status !== "archived").length,
    };
  });
}

export function shippingCostFromSettings(subtotalPkr: number, countryCode: string, settings: StoreSettings) {
  return resolveShippingOption(countryCode, undefined, subtotalPkr, settings).amountPkr;
}

export async function markOrderPaid(orderNumber: string, stripeSessionId?: string) {
  const result = await mutate((state) => {
    const order = state.orders.find(
      (item) => item.orderNumber === orderNumber || item.orderNumber === orderNumber.toUpperCase(),
    );
    if (!order) throw new PlatformError("Order not found.", 404);
    const newlyPaid = order.paymentStatus !== "paid";
    order.paymentStatus = "paid";
    if (order.status === "pending") order.status = "confirmed";
    if (stripeSessionId) order.stripeSessionId = stripeSessionId;
    order.updatedAt = new Date().toISOString();
    return { order, newlyPaid };
  });
  if (result.newlyPaid) {
    await sendOrderConfirmation(result.order).catch((error) => console.error("[email]", error));
  }
  return result.order;
}
