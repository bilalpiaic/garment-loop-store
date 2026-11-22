import { hashPassword } from "@/lib/password";
import { createId } from "@/lib/ids";
import type { AdminUser, StoreSettings } from "@/lib/identity";
import type { Role } from "@/lib/roles";
import { resolveShippingOption } from "@/lib/shipping";
import { mergeStockIntoCatalog, type PlatformState } from "@/lib/platform-state";
import type {
  ProductReview,
  ReturnReasonCode,
  ReturnRequest,
  WishlistEntry,
} from "@/lib/commerce-types";
import { sendOrderConfirmation, sendReturnRequestNotice } from "@/lib/email";
import { PlatformError, mutate, readPlatform } from "@/lib/platform-internals";

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

export async function listApprovedReviews(productId?: string) {
  return readPlatform((state) => {
    const reviews = (state.reviews ?? []).filter((review) => review.status === "approved");
    return productId ? reviews.filter((review) => review.productId === productId) : reviews;
  });
}

export async function listReviewsForAdmin() {
  return readPlatform((state) => [...(state.reviews ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function submitReview(input: {
  productId: string;
  productSlug: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string;
  body: string;
  customerId?: string;
}) {
  if (input.rating < 1 || input.rating > 5) {
    throw new PlatformError("Rating must be between 1 and 5.");
  }
  return mutate((state) => {
    state.reviews = state.reviews ?? [];
    const review: ProductReview = {
      id: createId("rev"),
      productId: input.productId,
      productSlug: input.productSlug,
      authorName: input.authorName.trim(),
      authorEmail: input.authorEmail.trim().toLowerCase(),
      customerId: input.customerId,
      rating: input.rating,
      title: input.title.trim(),
      body: input.body.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    state.reviews.unshift(review);
    return review;
  });
}

export async function moderateReview(id: string, status: "approved" | "rejected") {
  return mutate((state) => {
    const review = (state.reviews ?? []).find((item) => item.id === id);
    if (!review) throw new PlatformError("Review not found.", 404);
    review.status = status;
    review.moderatedAt = new Date().toISOString();
    return review;
  });
}

export async function getWishlist(customerId: string) {
  return readPlatform((state) => state.wishlists?.[customerId] ?? []);
}

export async function setWishlist(customerId: string, entries: WishlistEntry[]) {
  return mutate((state) => {
    state.wishlists = state.wishlists ?? {};
    state.wishlists[customerId] = entries;
    return entries;
  });
}

export async function toggleWishlistProduct(customerId: string, productId: string) {
  return mutate((state) => {
    state.wishlists = state.wishlists ?? {};
    const current = state.wishlists[customerId] ?? [];
    const exists = current.find((item) => item.productId === productId);
    const next = exists
      ? current.filter((item) => item.productId !== productId)
      : [...current, { productId, addedAt: new Date().toISOString() }];
    state.wishlists[customerId] = next;
    return next;
  });
}

export async function listReturns() {
  return readPlatform((state) =>
    [...(state.returns ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listReturnsForCustomer(customerId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readPlatform((state) =>
    [...(state.returns ?? [])]
      .filter(
        (item) =>
          item.customerId === customerId || item.customerEmail.toLowerCase() === normalized,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

function restockReturnItems(state: PlatformState, request: ReturnRequest, now: string) {
  for (const item of request.items) {
    state.stock[item.variantId] = (state.stock[item.variantId] ?? 0) + item.quantity;
    state.inventoryMovements.unshift({
      id: createId("mov"),
      variantId: item.variantId,
      change: item.quantity,
      type: "return",
      relatedOrderNumber: request.orderNumber,
      reason: `RMA ${request.id}`,
      createdAt: now,
    });
  }
}

export async function createReturnRequest(input: {
  orderNumber: string;
  reason: string;
  reasonCode?: ReturnReasonCode;
  type?: "return" | "exchange";
  items?: { variantId: string; quantity: number }[];
  customerId?: string;
  requireDelivered?: boolean;
  source?: "customer" | "admin";
}) {
  const request = await mutate((state) => {
    const order = state.orders.find(
      (item) => item.orderNumber === input.orderNumber || item.orderNumber === input.orderNumber.toUpperCase(),
    );
    if (!order) throw new PlatformError("Order not found.", 404);

    if (input.customerId || input.requireDelivered) {
      if (input.customerId && order.customerId && order.customerId !== input.customerId) {
        throw new PlatformError("You can only return your own orders.", 403);
      }
      if (order.status !== "delivered" && order.status !== "shipped") {
        throw new PlatformError("Returns are available after the order is shipped or delivered.");
      }
      const open = (state.returns ?? []).some(
        (item) =>
          item.orderNumber === order.orderNumber &&
          (item.status === "requested" || item.status === "approved"),
      );
      if (open) {
        throw new PlatformError("A return request is already open for this order.");
      }
    }

    state.returns = state.returns ?? [];
    const lines =
      input.items && input.items.length > 0
        ? input.items.map((item) => {
            const line = order.items.find((entry) => entry.variantId === item.variantId);
            if (!line) throw new PlatformError("Return item not on order.");
            if (item.quantity > line.quantity) {
              throw new PlatformError(`Quantity too high for ${line.productTitle}.`);
            }
            return {
              variantId: line.variantId,
              productTitle: line.productTitle,
              quantity: item.quantity,
            };
          })
        : order.items.map((line) => ({
            variantId: line.variantId,
            productTitle: line.productTitle,
            quantity: line.quantity,
          }));
    if (lines.length === 0) throw new PlatformError("Select at least one item to return.");

    const now = new Date().toISOString();
    const request: ReturnRequest = {
      id: createId("rma"),
      orderNumber: order.orderNumber,
      customerEmail: order.customer.email,
      customerName: order.customer.fullName,
      customerId: input.customerId ?? order.customerId,
      items: lines,
      reason: input.reason.trim(),
      reasonCode: input.reasonCode,
      type: input.type ?? (input.reasonCode === "exchange" ? "exchange" : "return"),
      status: "requested",
      createdAt: now,
      updatedAt: now,
      source: input.source ?? "admin",
    };
    state.returns.unshift(request);
    return request;
  });
  await sendReturnRequestNotice(request).catch((error) => console.error("[email]", error));
  return request;
}

export async function updateReturnRequest(
  id: string,
  action: "approve" | "reject" | "restock" | "refund",
  adminNote?: string,
) {
  return mutate((state) => {
    const request = (state.returns ?? []).find((item) => item.id === id);
    if (!request) throw new PlatformError("Return not found.", 404);
    const now = new Date().toISOString();
    if (adminNote) request.adminNote = adminNote;
    request.updatedAt = now;
    if (action === "approve") {
      // Approve + restock stub in one step for ops speed.
      restockReturnItems(state, request, now);
      request.status = "restocked";
      const order = state.orders.find((item) => item.orderNumber === request.orderNumber);
      if (order) {
        order.status = "returned";
        order.updatedAt = now;
      }
    } else if (action === "reject") {
      request.status = "rejected";
    } else if (action === "restock") {
      restockReturnItems(state, request, now);
      request.status = "restocked";
    } else if (action === "refund") {
      request.status = "refunded";
      const order = state.orders.find((item) => item.orderNumber === request.orderNumber);
      if (order) {
        order.paymentStatus = "refunded";
        order.updatedAt = now;
      }
    }
    return request;
  });
}
