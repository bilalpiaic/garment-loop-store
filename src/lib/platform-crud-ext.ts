import type { Product } from "@/lib/catalog";
import type { OrderStatus } from "@/lib/order-model";
import { PlatformError, mutate, updateOrder } from "@/lib/platform-internals";

export async function bulkSetProductStatus(ids: string[], status: Product["status"]) {
  return mutate((state) => {
    let updated = 0;
    for (const id of ids) {
      const product = state.catalog.products.find((item) => item.id === id);
      if (!product) continue;
      product.status = status ?? "archived";
      updated += 1;
    }
    if (updated === 0) throw new PlatformError("No matching products.", 404);
    return { updated, status };
  });
}

export async function setCollectionProducts(slug: string, productIds: string[]) {
  return mutate((state) => {
    const collection = state.catalog.collections.find((item) => item.slug === slug);
    if (!collection) throw new PlatformError("Collection not found.", 404);
    const idSet = new Set(productIds);
    for (const product of state.catalog.products) {
      const has = product.collections.includes(slug);
      const should = idSet.has(product.id);
      if (should && !has) product.collections = [...product.collections, slug];
      if (!should && has) product.collections = product.collections.filter((value) => value !== slug);
    }
    return {
      slug,
      count: state.catalog.products.filter((product) => product.collections.includes(slug)).length,
    };
  });
}

export async function bulkUpdateOrders(orderNumbers: string[], status: OrderStatus) {
  const results = [];
  for (const orderNumber of orderNumbers) {
    results.push(await updateOrder(orderNumber, { status }));
  }
  return { updated: results.length, orders: results };
}

export async function updateCustomerProfile(input: {
  id: string;
  fullName?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}) {
  return mutate((state) => {
    const customer = state.customers.find((item) => item.id === input.id);
    if (!customer) throw new PlatformError("Customer not found.", 404);
    if (input.fullName !== undefined) customer.fullName = input.fullName;
    if (input.phone !== undefined) customer.phone = input.phone;
    if (input.notes !== undefined) customer.notes = input.notes;
    if (input.tags !== undefined) {
      customer.tags = [...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean))];
    }
    return customer;
  });
}

export async function replyToReview(id: string, adminReply: string) {
  return mutate((state) => {
    const review = (state.reviews ?? []).find((item) => item.id === id);
    if (!review) throw new PlatformError("Review not found.", 404);
    review.adminReply = adminReply.trim();
    review.repliedAt = new Date().toISOString();
    return review;
  });
}

export async function deleteReview(id: string) {
  return mutate((state) => {
    const before = (state.reviews ?? []).length;
    state.reviews = (state.reviews ?? []).filter((item) => item.id !== id);
    if (state.reviews.length === before) throw new PlatformError("Review not found.", 404);
    return { ok: true };
  });
}
