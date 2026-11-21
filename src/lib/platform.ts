import { cache } from "react";
import { cookies } from "next/headers";
import {
  categories as seedCategories,
  collections as seedCollections,
  getVariant,
  products as seedProducts,
  type CatalogData,
  type Category,
  type Collection,
  type Product,
} from "@/lib/catalog";
import { hashPassword, sha256, verifyPassword } from "@/lib/password";
import { createId, createOtpCode, createToken } from "@/lib/ids";
import { slugify } from "@/lib/slug";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  DEFAULT_SETTINGS,
  type AdminUser,
  type CustomerAddress,
  type Discount,
  type StoreSettings,
} from "@/lib/identity";
import { withLock } from "@/lib/lock";
import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/order-model";
import { readDemoState, writeDemoState } from "@/lib/platform-memory";
import { loadNeonState, neonAvailable, saveNeonState } from "@/lib/platform-neon";
import { mergeStockIntoCatalog, publicCatalog, type ContentPage, type PlatformState } from "@/lib/platform-state";
import { can, type Permission, type Role } from "@/lib/roles";
import { resolveShippingOption } from "@/lib/shipping";
import { estimateTaxPkr } from "@/lib/tax";
import type {
  ProductReview,
  ReturnReasonCode,
  ReturnRequest,
  WishlistEntry,
} from "@/lib/commerce-types";
import { stripeConfigured } from "@/lib/stripe";
import { sendOrderConfirmation, sendReturnRequestNotice, sendShipmentNotice } from "@/lib/email";
import { ensureDemoWalkthrough } from "@/lib/seed-demo";

const OTP_TTL_MS = 10 * 60 * 1000;
const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export class PlatformError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

type MutateFn<T> = (state: PlatformState) => Promise<T> | T;

async function loadState(): Promise<{ state: PlatformState; backend: "neon" | "demo" }> {
  if (neonAvailable()) {
    try {
      return { state: await loadNeonState(), backend: "neon" };
    } catch (error) {
      console.error("[platform] Neon unavailable — using in-memory/file demo store.", error);
    }
  }
  return { state: readDemoState(), backend: "demo" };
}

async function persistState(state: PlatformState, backend: "neon" | "demo") {
  if (backend === "neon") {
    try {
      await saveNeonState(state);
      return;
    } catch (error) {
      console.error("[platform] Neon save failed — writing demo store instead.", error);
    }
  }
  writeDemoState(state);
}

async function run<T>(fn: MutateFn<T>, persist: boolean): Promise<T> {
  return withLock("platform", async () => {
    const { state, backend } = await loadState();
    const seeded = await ensureSeed(state);
    const demoSeeded = ensureDemoWalkthrough(state);
    const result = await fn(state);
    if (persist || seeded || demoSeeded) {
      await persistState(state, backend);
    }
    return result;
  });
}

async function mutate<T>(fn: MutateFn<T>): Promise<T> {
  return run(fn, true);
}

export async function readPlatform<T>(fn: MutateFn<T>): Promise<T> {
  return run(fn, false);
}

async function ensureSeed(state: PlatformState) {
  let changed = false;
  if (state.catalog.products.length === 0) {
    changed = true;
    state.catalog.products = seedProducts.map((product) => ({
      ...product,
      status: product.status ?? "published",
      variants: product.variants.map((variant) => ({ ...variant })),
    }));
  }
  if (state.catalog.categories.length === 0) {
    changed = true;
    state.catalog.categories = seedCategories.map((item) => ({ ...item }));
  }
  if (state.catalog.collections.length === 0) {
    changed = true;
    state.catalog.collections = seedCollections.map((item) => ({ ...item }));
  }
  for (const product of state.catalog.products) {
    for (const variant of product.variants) {
      if (!(variant.id in state.stock)) {
        state.stock[variant.id] = variant.stock;
        changed = true;
      }
    }
  }
  if (state.adminUsers.length === 0) {
    changed = true;
    const now = new Date().toISOString();
    const seeds: { email: string; name: string; role: Role; password: string }[] = [
      {
        email: (process.env.ADMIN_EMAIL ?? "owner@garmentloop.store").toLowerCase(),
        name: "Owner",
        role: "owner",
        password: process.env.ADMIN_PASSWORD ?? "GarmentLoop-Owner-2026",
      },
      {
        email: "admin@garmentloop.store",
        name: "Store Admin",
        role: "admin",
        password: "GarmentLoop-Admin-2026",
      },
      {
        email: "staff@garmentloop.store",
        name: "Floor Staff",
        role: "staff",
        password: "GarmentLoop-Staff-2026",
      },
    ];
    for (const seed of seeds) {
      if (state.adminUsers.some((user) => user.email === seed.email)) continue;
      state.adminUsers.push({
        id: createId("usr"),
        email: seed.email,
        name: seed.name,
        passwordHash: await hashPassword(seed.password),
        role: seed.role,
        active: true,
        createdAt: now,
      });
    }
  }
  if (!state.pages) {
    state.pages = [];
    changed = true;
  }
  pruneExpired(state);
  return changed;
}

export async function listContentPages() {
  return readPlatform((state) => [...(state.pages ?? [])]);
}

export async function getContentPage(slug: string) {
  return readPlatform((state) => (state.pages ?? []).find((page) => page.slug === slug) ?? null);
}

export async function saveContentPage(page: ContentPage) {
  return mutate((state) => {
    state.pages = state.pages ?? [];
    const index = state.pages.findIndex((item) => item.slug === page.slug);
    const next = { ...page, updatedAt: new Date().toISOString() };
    if (index >= 0) state.pages[index] = next;
    else state.pages.push(next);
    return next;
  });
}

export function persistenceInfo() {
  return {
    neon: neonAvailable(),
    mode: neonAvailable() ? "neon" : process.env.VERCEL ? "memory-demo" : "file-demo",
  };
}

function pruneExpired(state: PlatformState) {
  const now = Date.now();
  state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  state.otp = state.otp.filter((item) => new Date(item.expiresAt).getTime() > now);
}

function shippingFor(
  state: PlatformState,
  subtotal: number,
  country: string,
  shippingMethodId?: string,
) {
  return resolveShippingOption(country, shippingMethodId, subtotal, {
    ...DEFAULT_SETTINGS,
    ...state.settings,
  });
}

export const getPublishedCatalog = cache(async (): Promise<CatalogData> => {
  return readPlatform((state) => publicCatalog(state));
});

export const getAdminCatalog = cache(async (): Promise<CatalogData> => {
  return readPlatform((state) => mergeStockIntoCatalog(state));
});

export const getSettings = cache(async (): Promise<StoreSettings> => {
  return readPlatform((state) => ({ ...DEFAULT_SETTINGS, ...state.settings }));
});

export async function updateSettings(patch: Partial<StoreSettings>) {
  return mutate((state) => {
    state.settings = { ...state.settings, ...patch };
    return state.settings;
  });
}

function applyDiscount(discount: Discount | undefined, subtotal: number) {
  if (!discount || !discount.active) return 0;
  if (discount.expiresAt && new Date(discount.expiresAt).getTime() < Date.now()) return 0;
  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return 0;
  if (discount.minOrderPkr && subtotal < discount.minOrderPkr) return 0;
  if (discount.type === "percentage") {
    return Math.min(subtotal, Math.round((subtotal * discount.value) / 100));
  }
  return Math.min(subtotal, discount.value);
}

export async function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
  shippingMethodId: string;
  discountCode?: string;
  customerId?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  try {
    if (input.paymentMethod === "stripe" && !stripeConfigured()) {
      return { ok: false, error: "Card payments are unavailable. Choose COD, bank transfer, or card demo." };
    }
    const order = await mutate((state) => {
      if (input.items.length === 0) {
        throw new PlatformError("Your cart is empty.");
      }
      const lines: OrderLine[] = [];
      for (const item of input.items) {
        if (item.quantity < 1) throw new PlatformError("Invalid quantity.");
        const match = getVariant(item.variantId, state.catalog.products);
        if (!match) throw new PlatformError("One of the items is no longer available.");
        const available = state.stock[item.variantId] ?? match.variant.stock;
        if (available < item.quantity) {
          throw new PlatformError(
            `${match.product.title} (${match.variant.color}, ${match.variant.size}) is out of stock.`,
          );
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

      const subtotalPkr = lines.reduce((sum, line) => sum + line.totalPkr, 0);
      const code = input.discountCode?.trim().toUpperCase();
      const discount = code
        ? state.discounts.find((item) => item.code.toUpperCase() === code)
        : undefined;
      if (code && !discount) {
        throw new PlatformError("That discount code is not valid.");
      }
      const discountPkr = applyDiscount(discount, subtotalPkr);
      const afterDiscount = subtotalPkr - discountPkr;
      const shipping = shippingFor(state, afterDiscount, input.customer.country, input.shippingMethodId);
      const taxPkr = estimateTaxPkr(afterDiscount, input.customer.country);
      const paymentStatus: PaymentStatus =
        input.paymentMethod === "card_demo" ? "paid" : "pending";
      const status: OrderStatus =
        input.paymentMethod === "cod" || input.paymentMethod === "card_demo"
          ? "confirmed"
          : "pending";

      const customer = upsertCustomer(state, input.customer, input.customerId);

      state.orderSeq += 1;
      const orderNumber = `GL-${String(state.orderSeq).padStart(4, "0")}`;
      const now = new Date().toISOString();

      for (const line of lines) {
        const current = state.stock[line.variantId] ?? 0;
        if (current < line.quantity) {
          throw new PlatformError("One of the items is out of stock.");
        }
        state.stock[line.variantId] = current - line.quantity;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: line.variantId,
          change: -line.quantity,
          type: "sale",
          relatedOrderNumber: orderNumber,
          createdAt: now,
        });
      }

      if (discount) {
        discount.usedCount += 1;
      }

      const order: Order = {
        orderNumber,
        createdAt: now,
        updatedAt: now,
        customerId: customer.id,
        customer: input.customer,
        items: lines,
        subtotalPkr,
        shippingPkr: shipping.amountPkr,
        taxPkr,
        discountPkr: discountPkr || undefined,
        totalPkr: afterDiscount + shipping.amountPkr + taxPkr,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        status,
        currency: input.currency,
        shippingMethodId: shipping.id,
        shippingLabel: shipping.label,
        discountCode: code,
      };
      state.orders.unshift(order);
      return order;
    });
    // Stripe confirmation email fires after payment (webhook / confirm). Others send now.
    if (order.paymentMethod !== "stripe") {
      await sendOrderConfirmation(order).catch((error) => console.error("[email]", error));
    }
    return { ok: true, order };
  } catch (error) {
    if (error instanceof PlatformError) {
      return { ok: false, error: error.message };
    }
    console.error("Checkout failed", error);
    return { ok: false, error: "Could not place the order. Please try again." };
  }
}

function upsertCustomer(state: PlatformState, details: CheckoutCustomer, customerId?: string) {
  const email = details.email.trim().toLowerCase();
  let customer =
    (customerId ? state.customers.find((item) => item.id === customerId) : undefined) ??
    state.customers.find((item) => item.email === email);
  if (!customer) {
    customer = {
      id: createId("cus"),
      email,
      phone: details.phone,
      fullName: details.fullName,
      createdAt: new Date().toISOString(),
    };
    state.customers.unshift(customer);
  } else {
    customer.phone = details.phone || customer.phone;
    customer.fullName = details.fullName || customer.fullName;
  }

  const duplicate = state.addresses.find(
    (address) =>
      address.customerId === customer.id &&
      address.address === details.address &&
      address.city === details.city,
  );
  if (!duplicate) {
    if (!state.addresses.some((address) => address.customerId === customer.id && address.isDefault)) {
      state.addresses.unshift({
        id: createId("adr"),
        customerId: customer.id,
        fullName: details.fullName,
        phone: details.phone,
        country: details.country,
        city: details.city,
        area: details.area,
        address: details.address,
        isDefault: true,
      });
    }
  }
  return customer;
}

export async function getOrder(orderNumber: string) {
  return readPlatform((state) =>
    state.orders.find((order) => order.orderNumber === orderNumber.toUpperCase()),
  );
}

export async function listOrders() {
  return readPlatform((state) =>
    [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

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
    state.cata