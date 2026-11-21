import {
  PlatformError,
  mutate,
  readPlatform,
} from "@/lib/platform-core-a";
import { createId } from "@/lib/ids";
import { slugify } from "@/lib/slug";
import { getVariant, type CatalogData, type Category, type Collection, type Product } from "@/lib/catalog";
import type { OrderStatus, PaymentStatus } from "@/lib/order-model";
import { mergeStockIntoCatalog, type PlatformState } from "@/lib/platform-state";
import { sendShipmentNotice } from "@/lib/email";

export async function getStock(variantId: string) {
  return readPlatform((state) => {
    if (variantId in state.stock) return state.stock[variantId] ?? 0;
    return getVariant(variantId, state.catalog.products)?.variant.stock ?? 0;
  });
}

export async function updateOrder(
  orderNumber: string,
  patch: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    trackingNumber?: string;
    courier?: string;
    notes?: string;
  },
) {
  const result = await mutate((state) => {
    const order = state.orders.find((item) => item.orderNumber === orderNumber.toUpperCase());
    if (!order) throw new PlatformError("Order not found.", 404);
    const previous = order.status;
    if (patch.status) order.status = patch.status;
    if (patch.paymentStatus) order.paymentStatus = patch.paymentStatus;
    if (patch.trackingNumber !== undefined) order.trackingNumber = patch.trackingNumber;
    if (patch.courier !== undefined) order.courier = patch.courier;
    if (patch.notes !== undefined) order.notes = patch.notes;
    order.updatedAt = new Date().toISOString();

    const restoring = patch.status === "cancelled" && previous !== "cancelled";
    if (restoring) {
      for (const line of order.items) {
        state.stock[line.variantId] = (state.stock[line.variantId] ?? 0) + line.quantity;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: line.variantId,
          change: line.quantity,
          type: "cancel",
          relatedOrderNumber: order.orderNumber,
          createdAt: new Date().toISOString(),
          reason: "Order cancelled",
        });
      }
    }
    return { order, becameShipped: previous !== "shipped" && order.status === "shipped" };
  });
  if (result.becameShipped) {
    await sendShipmentNotice(result.order).catch((error) => console.error("[email]", error));
  }
  return result.order;
}

export async function saveProduct(input: Product, actorId?: string) {
  return mutate((state) => {
    const product: Product = {
      ...input,
      id: input.id || slugify(input.title) || createId("prd"),
      slug: input.slug || slugify(input.title),
      status: input.status ?? "published",
    };
    const existing = state.catalog.products.findIndex((item) => item.id === product.id);
    if (existing >= 0) {
      state.catalog.products[existing] = product;
    } else {
      const slugTaken = state.catalog.products.some(
        (item) => item.slug === product.slug && item.id !== product.id,
      );
      if (slugTaken) throw new PlatformError("That product slug is already in use.");
      state.catalog.products.unshift(product);
    }
    for (const variant of product.variants) {
      if (!(variant.id in state.stock)) {
        state.stock[variant.id] = variant.stock;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: variant.id,
          change: variant.stock,
          type: "restock",
          actorId,
          reason: "Product saved",
          createdAt: new Date().toISOString(),
        });
      }
    }
    return product;
  });
}

export async function deleteProduct(id: string) {
  return mutate((state) => {
    const product = state.catalog.products.find((item) => item.id === id);
    if (!product) throw new PlatformError("Product not found.", 404);
    product.status = "archived";
    return product;
  });
}

export async function saveCategory(input: Category) {
  return mutate((state) => {
    const slug = input.slug || slugify(input.name);
    const next = { ...input, slug };
    const index = state.catalog.categories.findIndex((item) => item.slug === slug);
    if (index >= 0) state.catalog.categories[index] = next;
    else state.catalog.categories.push(next);
    return next;
  });
}

export async function deleteCategory(slug: string) {
  return mutate((state) => {
    const inUse = state.catalog.products.some(
      (product) => product.category === slug && product.status !== "archived",
    );
    if (inUse) throw new PlatformError("Unassign this category from products first.");
    state.catalog.categories = state.catalog.categories.filter((item) => item.slug !== slug);
  });
}

export async function saveCollection(input: Collection) {
  return mutate((state) => {
    const slug = input.slug || slugify(input.name);
    const next = { ...input, slug };
    const index = state.catalog.collections.findIndex((item) => item.slug === slug);
    if (index >= 0) state.catalog.collections[index] = next;
    else state.catalog.collections.push(next);
    return next;
  });
}

export async function deleteCollection(slug: string) {
  return mutate((state) => {
    state.catalog.products = state.catalog.products.map((product) => ({
      ...product,
      collections: product.collections.filter((item) => item !== slug),
    }));
    state.catalog.collections = state.catalog.collections.filter((item) => item.slug !== slug);
  });
}

export async function adjustInventory(input: {
  variantId: string;
  change: number;
  reason?: string;
  actorId?: string;
}) {
  return mutate((state) => {
    const match = getVariant(input.variantId, state.catalog.products);
    if (!match) throw new PlatformError("Variant not found.", 404);
    const current = state.stock[input.variantId] ?? match.variant.stock;
    const next = current + input.change;
    if (next < 0) throw new PlatformError("Stock cannot go below zero.");
    state.stock[input.variantId] = next;
    match.variant.stock = next;
    const product = state.catalog.products.find((item) => item.id === match.product.id);
    if (product) {
      const variant = product.variants.find((item) => item.id === input.variantId);
      if (variant) variant.stock = next;
    }
    state.inventoryMovements.unshift({
      id: createId("mov"),
      variantId: input.variantId,
      change: input.change,
      type: input.change >= 0 ? "restock" : "manual",
      reason: input.reason,
      actorId: input.actorId,
      createdAt: new Date().toISOString(),
    });
    return next;
  });
}

export async function listInventory() {
  return readPlatform((state) => {
    const catalog = mergeStockIntoCatalog(state);
    return catalog.products.flatMap((product) =>
      product.variants.map((variant) => ({
        productId: product.id,
        productTitle: product.title,
        slug: product.slug,
        variantId: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        stock: variant.stock,
        low: variant.stock <= state.settings.lowStockThreshold,
      })),
    );
  });
}

export async function listMovements(limit = 50) {
  return readPlatform((state) => state.inventoryMovements.slice(0, limit));
}
