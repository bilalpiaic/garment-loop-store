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
import { appendAudit, type AuditEntry } from "@/lib/audit";
import { buildProductsFromCsv, parseProductCsv, productsToCsv } from "@/lib/csv-products";
import { hashPassword, sha256, verifyPassword } from "@/lib/password";
import { createId, createOtpCode, createToken } from "@/lib/ids";
import { rejectCardDemoIfDisallowed } from "@/lib/card-demo";
import { slugify } from "@/lib/slug";
import {
  ADMIN_COOKIE,
  ADMIN_MFA_COOKIE,
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
import { getDialect } from "@/db/client";
import { loadNeonState, neonAvailable, saveNeonState } from "@/lib/platform-neon";
import { mergeStockIntoCatalog, publicCatalog, type ContentPage, type PlatformState } from "@/lib/platform-state";
import { can, type Permission, type Role } from "@/lib/roles";
import { isEasyPostMethodId, resolveShippingOption } from "@/lib/shipping";
import { retrieveEasyPostRateOption } from "@/lib/easypost";
import { quoteTax } from "@/lib/tax";
import type {
  CircularPlanId,
  CircularSubscription,
  CircularSubscriptionStatus,
  ProductReview,
  RepairRequest,
  RepairStatus,
  ReturnReasonCode,
  ReturnRequest,
  TakeBackCondition,
  TakeBackRequest,
  TakeBackStatus,
  WishlistEntry,
} from "@/lib/commerce-types";
import {
  circularSubscriptionsMockForced,
  getCircularPlan,
} from "@/lib/circular";
import { stripeConfigured } from "@/lib/stripe";
import {
  publicEmailError,
  sendLoginOtpEmail,
  sendOrderConfirmation,
  sendReturnRequestNotice,
  sendShipmentNotice,
} from "@/lib/email";
import { ensureDemoWalkthrough } from "@/lib/seed-demo";
import {
  adminMfaRequiredByPolicy,
  buildOtpAuthUri,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/totp";

const OTP_TTL_MS = 10 * 60 * 1000;
const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MFA_CHALLENGE_MS = 10 * 60 * 1000;

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
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.error(
        "[admin] No admin users seeded — set ADMIN_EMAIL and ADMIN_PASSWORD before first boot.",
      );
    } else {
      changed = true;
      const now = new Date().toISOString();
      state.adminUsers.push({
        id: createId("usr"),
        email,
        name: "Owner",
        passwordHash: await hashPassword(password),
        role: "owner",
        active: true,
        createdAt: now,
      });
    }
  }
  if (!state.pages) {
    state.pages = [];
    changed = true;
  }
  if (!state.auditLogs) {
    state.auditLogs = [];
    changed = true;
  }
  if (!state.mfaChallenges) {
    state.mfaChallenges = [];
    changed = true;
  }
  if (!state.takeBacks) {
    state.takeBacks = [];
    changed = true;
  }
  if (!state.repairs) {
    state.repairs = [];
    changed = true;
  }
  if (!state.circularSubscriptions) {
    state.circularSubscriptions = [];
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
  const dialect = getDialect();
  return {
    neon: dialect === "postgres",
    mysql: dialect === "mysql",
    mode: dialect === "mysql"
      ? "mysql"
      : dialect === "postgres"
        ? "neon"
        : process.env.VERCEL
          ? "memory-demo"
          : "file-demo",
  };
}

function pruneExpired(state: PlatformState) {
  const now = Date.now();
  state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  state.otp = state.otp.filter((item) => new Date(item.expiresAt).getTime() > now);
  state.mfaChallenges = (state.mfaChallenges ?? []).filter(
    (item) => new Date(item.expiresAt).getTime() > now,
  );
}

type AuditActor = { id: string; email: string; role?: Role };

function auditActor(state: PlatformState, actorId?: string): AuditActor | undefined {
  if (!actorId) return undefined;
  const user = state.adminUsers.find((item) => item.id === actorId);
  if (!user) return { id: actorId, email: "unknown" };
  return { id: user.id, email: user.email, role: user.role };
}

function writeAudit(
  state: PlatformState,
  actor: AuditActor | undefined,
  entry: {
    action: string;
    entity: string;
    entityId?: string;
    summary: string;
    meta?: Record<string, unknown>;
  },
) {
  if (!actor) return;
  appendAudit(state, {
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    summary: entry.summary,
    meta: entry.meta,
  });
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

export async function updateSettings(patch: Partial<StoreSettings>, actorId?: string) {
  return mutate((state) => {
    state.settings = { ...state.settings, ...patch };
    writeAudit(state, auditActor(state, actorId), {
      action: "settings.update",
      entity: "settings",
      entityId: "store",
      summary: "Updated store settings",
      meta: { keys: Object.keys(patch) },
    });
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
    const cardDemoBlock = rejectCardDemoIfDisallowed(input.paymentMethod);
    if (cardDemoBlock) {
      return { ok: false, error: cardDemoBlock };
    }
    if (input.paymentMethod === "stripe" && !stripeConfigured()) {
      return {
        ok: false,
        error: "Card payments are unavailable. Choose COD or bank transfer.",
      };
    }

    // Resolve EasyPost outside mutate so we can await the carrier API safely.
    // Rate must match this order's destination + parcel (not a cheaper quote for elsewhere).
    const itemCount = input.items.reduce((sum, item) => sum + item.quantity, 0);
    const postalCode = input.customer.postalCode?.trim() ?? "";
    let liveShipping = null;
    if (isEasyPostMethodId(input.shippingMethodId)) {
      if (!postalCode) {
        return {
          ok: false,
          error: "Postal / ZIP is required for live carrier rates. Refresh shipping options.",
        };
      }
      liveShipping = await retrieveEasyPostRateOption(
        input.shippingMethodId,
        {
          to: {
            name: input.customer.fullName,
            street1: input.customer.address,
            city: input.customer.city,
            state: input.customer.area || input.customer.city,
            zip: postalCode,
            country: input.customer.country,
            phone: input.customer.phone,
          },
          itemCount: Math.max(1, itemCount),
        },
        await getSettings(),
      );
      if (!liveShipping) {
        return {
          ok: false,
          error:
            "That carrier rate does not match this order’s address or bag. Go back and refresh shipping options.",
        };
      }
    }

    // Preview taxable amount + shipping so we can await Avalara/TaxJar before committing stock.
    const preview = await readPlatform((state) => {
      if (input.items.length === 0) throw new PlatformError("Your cart is empty.");
      let subtotalPkr = 0;
      for (const item of input.items) {
        const match = getVariant(item.variantId, state.catalog.products);
        if (!match) throw new PlatformError("One of the items is no longer available.");
        const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
        subtotalPkr += unit * item.quantity;
      }
      const code = input.discountCode?.trim().toUpperCase();
      const discount = code
        ? state.discounts.find((item) => item.code.toUpperCase() === code)
        : undefined;
      if (code && !discount) throw new PlatformError("That discount code is not valid.");
      const discountPkr = applyDiscount(discount, subtotalPkr);
      const afterDiscount = subtotalPkr - discountPkr;
      const shipping =
        liveShipping ??
        shippingFor(state, afterDiscount, input.customer.country, input.shippingMethodId);
      return { afterDiscount, shippingAmount: shipping.amountPkr };
    });

    const taxQuote = await quoteTax({
      taxablePkr: preview.afterDiscount,
      shippingPkr: preview.shippingAmount,
      address: {
        country: input.customer.country,
        city: input.customer.city,
        area: input.customer.area,
        address: input.customer.address,
        postalCode: input.customer.postalCode,
      },
      customerCode: input.customer.email,
    });

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
      const shipping =
        liveShipping ??
        shippingFor(state, afterDiscount, input.customer.country, input.shippingMethodId);
      const taxPkr = taxQuote.amountPkr;
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
        accessToken: createToken(),
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
  actorId?: string,
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
    writeAudit(state, auditActor(state, actorId), {
      action: "order.update",
      entity: "order",
      entityId: order.orderNumber,
      summary: `Updated order ${order.orderNumber}`,
      meta: { ...patch, previousStatus: previous },
    });

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
    const isUpdate = existing >= 0;
    if (isUpdate) {
      state.catalog.products[existing] = product;
    } else {
      const slugTaken = state.catalog.products.some(
        (item) => item.slug === product.slug && item.id !== product.id,
      );
      if (slugTaken) throw new PlatformError("That product slug is already in use.");
      state.catalog.products.unshift(product);
    }
    const now = new Date().toISOString();
    for (const variant of product.variants) {
      const previous = state.stock[variant.id];
      if (previous === undefined) {
        state.stock[variant.id] = variant.stock;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: variant.id,
          change: variant.stock,
          type: "restock",
          actorId,
          reason: "Product created",
          createdAt: now,
        });
        continue;
      }
      const delta = variant.stock - previous;
      if (delta !== 0) {
        state.stock[variant.id] = variant.stock;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: variant.id,
          change: delta,
          type: delta > 0 ? "restock" : "manual",
          actorId,
          reason: "Product editor stock sync",
          createdAt: now,
        });
      }
    }
    writeAudit(state, auditActor(state, actorId), {
      action: isUpdate ? "product.update" : "product.create",
      entity: "product",
      entityId: product.id,
      summary: `${isUpdate ? "Updated" : "Created"} product ${product.title}`,
      meta: { slug: product.slug, status: product.status },
    });
    return product;
  });
}

export async function deleteProduct(id: string, actorId?: string) {
  return mutate((state) => {
    const product = state.catalog.products.find((item) => item.id === id);
    if (!product) throw new PlatformError("Product not found.", 404);
    product.status = "archived";
    writeAudit(state, auditActor(state, actorId), {
      action: "product.archive",
      entity: "product",
      entityId: product.id,
      summary: `Archived product ${product.title}`,
    });
    return product;
  });
}

export async function bulkSetProductStatus(ids: string[], status: Product["status"], actorId?: string) {
  return mutate((state) => {
    let updated = 0;
    for (const id of ids) {
      const product = state.catalog.products.find((item) => item.id === id);
      if (!product) continue;
      product.status = status ?? "archived";
      updated += 1;
    }
    if (updated === 0) throw new PlatformError("No matching products.", 404);
    writeAudit(state, auditActor(state, actorId), {
      action: "product.bulk_status",
      entity: "product",
      summary: `Set ${updated} product(s) to ${status}`,
      meta: { ids, status },
    });
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
    writeAudit(state, auditActor(state, input.actorId), {
      action: "inventory.adjust",
      entity: "inventory",
      entityId: input.variantId,
      summary: `Adjusted stock for ${input.variantId} by ${input.change}`,
      meta: { change: input.change, reason: input.reason, next },
    });
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

export async function listCustomers() {
  return readPlatform((state) => {
    return state.customers.map((customer) => {
      const orders = state.orders.filter(
        (order) => order.customerId === customer.id || order.customer.email.toLowerCase() === customer.email,
      );
      return {
        ...customer,
        ordersCount: orders.length,
        lastOrderAt: orders[0]?.createdAt,
        totalSpendPkr: orders.reduce((sum, order) => sum + order.totalPkr, 0),
      };
    });
  });
}

export async function getCustomer(id: string) {
  return readPlatform((state) => {
    const customer = state.customers.find((item) => item.id === id);
    if (!customer) return undefined;
    const orders = state.orders.filter(
      (order) => order.customerId === customer.id || order.customer.email.toLowerCase() === customer.email,
    );
    const addresses = state.addresses.filter((address) => address.customerId === customer.id);
    return { customer, orders, addresses };
  });
}

export async function getCustomerByEmail(email: string) {
  return readPlatform((state) =>
    state.customers.find((item) => item.email === email.trim().toLowerCase()),
  );
}

export async function saveAddress(address: Omit<CustomerAddress, "id"> & { id?: string }) {
  return mutate((state) => {
    const next: CustomerAddress = {
      ...address,
      id: address.id ?? createId("adr"),
    };
    if (next.isDefault) {
      for (const item of state.addresses) {
        if (item.customerId === next.customerId) item.isDefault = false;
      }
    }
    const index = state.addresses.findIndex((item) => item.id === next.id);
    if (index >= 0) state.addresses[index] = next;
    else state.addresses.unshift(next);
    return next;
  });
}

export async function listDiscounts() {
  return readPlatform((state) => state.discounts);
}

export async function saveDiscount(input: Omit<Discount, "id" | "usedCount"> & { id?: string; usedCount?: number }) {
  return mutate((state) => {
    const code = input.code.trim().toUpperCase();
    const existing = state.discounts.find(
      (item) => item.code.toUpperCase() === code && item.id !== input.id,
    );
    if (existing) throw new PlatformError("That code already exists.");
    const discount: Discount = {
      id: input.id ?? createId("dsc"),
      code,
      description: input.description,
      type: input.type,
      value: input.value,
      minOrderPkr: input.minOrderPkr,
      usageLimit: input.usageLimit,
      usedCount: input.usedCount ?? 0,
      expiresAt: input.expiresAt,
      active: input.active,
    };
    const index = state.discounts.findIndex((item) => item.id === discount.id);
    if (index >= 0) state.discounts[index] = { ...discount, usedCount: state.discounts[index]!.usedCount };
    else state.discounts.unshift(discount);
    return discount;
  });
}

export async function deleteDiscount(id: string) {
  return mutate((state) => {
    state.discounts = state.discounts.filter((item) => item.id !== id);
  });
}

export async function requestCustomerOtp(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PlatformError("Enter a valid email.");
  }
  const code = createOtpCode();
  const expiresMinutes = Math.round(OTP_TTL_MS / 60_000);
  await mutate((state) => {
    const recent = state.otp.filter(
      (item) => item.email === email && Date.now() - new Date(item.createdAt).getTime() < 60 * 60 * 1000,
    );
    if (recent.length >= 5) {
      throw new PlatformError("Too many login attempts. Try again in an hour.", 429);
    }
    state.otp = state.otp.filter((item) => item.email !== email);
    state.otp.push({
      email,
      codeHash: sha256(`${email}:${code}`),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  });

  const mail = await sendLoginOtpEmail(email, code, expiresMinutes);
  if (!mail.ok) {
    console.error("[auth] OTP email failed", mail.mode, mail.error);
  }

  // Never return or log the code in production unless AUTH_SHOW_OTP=1.
  const show = process.env.AUTH_SHOW_OTP === "1" || process.env.NODE_ENV !== "production";
  if (show) {
    console.info(`[auth] OTP for ${email}: ${code} (email=${mail.mode}${mail.ok ? "" : ":failed"})`);
  } else {
    console.info(`[auth] OTP issued for ${email} (email=${mail.mode}${mail.ok ? "" : ":failed"})`);
  }

  return {
    ok: true as const,
    // Mock always returns ok — only treat Resend/SMTP as a real inbox delivery.
    emailed: mail.ok && mail.mode !== "mock",
    emailMode: mail.mode,
    emailError: publicEmailError(mail),
    devCode: show ? code : undefined,
  };
}

export async function verifyCustomerOtp(emailRaw: string, code: string) {
  const email = emailRaw.trim().toLowerCase();
  const sessionId = await mutate((state) => {
    const challenge = state.otp.find((item) => item.email === email);
    if (!challenge) throw new PlatformError("Request a new code first.");
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new PlatformError("That code has expired.");
    }
    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      throw new PlatformError("Too many attempts. Request a new code.");
    }
    if (challenge.codeHash !== sha256(`${email}:${code.trim()}`)) {
      throw new PlatformError("That code is incorrect.");
    }
    state.otp = state.otp.filter((item) => item.email !== email);
    let customer = state.customers.find((item) => item.email === email);
    if (!customer) {
      customer = {
        id: createId("cus"),
        email,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      state.customers.unshift(customer);
    } else {
      customer.lastLoginAt = new Date().toISOString();
    }
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "customer",
      userId: customer.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CUSTOMER_SESSION_MS).toISOString(),
    });
    return sessionId;
  });
  await setSessionCookie(CUSTOMER_COOKIE, sessionId, CUSTOMER_SESSION_MS);
  return { ok: true as const };
}

export async function loginAdmin(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const result = await mutate(async (state) => {
    const user = state.adminUsers.find((item) => item.email === email);
    if (!user || !user.active) throw new PlatformError("Invalid email or password.", 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new PlatformError("Invalid email or password.", 401);

    const policyRequires =
      adminMfaRequiredByPolicy() && (user.role === "owner" || user.role === "admin");
    const enrolled = Boolean(user.mfaEnabled && user.mfaSecret);

    if (enrolled) {
      const challengeId = createToken();
      state.mfaChallenges = state.mfaChallenges ?? [];
      state.mfaChallenges.push({
        id: challengeId,
        userId: user.id,
        purpose: "verify",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + MFA_CHALLENGE_MS).toISOString(),
      });
      return { kind: "mfa" as const, challengeId };
    }

    if (policyRequires && !enrolled) {
      const challengeId = createToken();
      const pendingSecret = generateTotpSecret();
      state.mfaChallenges = state.mfaChallenges ?? [];
      state.mfaChallenges.push({
        id: challengeId,
        userId: user.id,
        purpose: "setup",
        pendingSecret,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + MFA_CHALLENGE_MS).toISOString(),
      });
      return {
        kind: "setup" as const,
        challengeId,
        secret: pendingSecret,
        otpauthUrl: buildOtpAuthUri({ secret: pendingSecret, email: user.email }),
        email: user.email,
      };
    }

    user.lastLoginAt = new Date().toISOString();
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "admin",
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    });
    writeAudit(state, { id: user.id, email: user.email, role: user.role }, {
      action: "admin.login",
      entity: "admin",
      entityId: user.id,
      summary: `Admin login ${user.email}`,
    });
    return { kind: "ok" as const, sessionId };
  });

  if (result.kind === "mfa") {
    await setSessionCookie(ADMIN_MFA_COOKIE, result.challengeId, MFA_CHALLENGE_MS);
    return { ok: false as const, mfaRequired: true as const, challengeId: result.challengeId };
  }
  if (result.kind === "setup") {
    await setSessionCookie(ADMIN_MFA_COOKIE, result.challengeId, MFA_CHALLENGE_MS);
    return {
      ok: false as const,
      mfaSetupRequired: true as const,
      challengeId: result.challengeId,
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      email: result.email,
    };
  }
  await setSessionCookie(ADMIN_COOKIE, result.sessionId, ADMIN_SESSION_MS);
  const jar = await cookies();
  jar.delete(ADMIN_MFA_COOKIE);
  return { ok: true as const };
}

export async function verifyAdminMfa(code: string, challengeIdRaw?: string) {
  const jar = await cookies();
  const challengeId = challengeIdRaw || jar.get(ADMIN_MFA_COOKIE)?.value;
  if (!challengeId) throw new PlatformError("MFA challenge expired. Sign in again.", 401);

  const sessionId = await mutate((state) => {
    const challenge = (state.mfaChallenges ?? []).find((item) => item.id === challengeId);
    if (!challenge || new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new PlatformError("MFA challenge expired. Sign in again.", 401);
    }
    if (challenge.purpose !== "verify") {
      throw new PlatformError("Complete MFA enrollment first.", 400);
    }
    const user = state.adminUsers.find((item) => item.id === challenge.userId && item.active);
    if (!user?.mfaSecret || !user.mfaEnabled) {
      throw new PlatformError("MFA is not enabled for this account.", 400);
    }
    if (!verifyTotpCode(user.mfaSecret, code)) {
      throw new PlatformError("Invalid authenticator code.", 401);
    }
    state.mfaChallenges = (state.mfaChallenges ?? []).filter((item) => item.id !== challengeId);
    user.lastLoginAt = new Date().toISOString();
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "admin",
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    });
    writeAudit(state, { id: user.id, email: user.email, role: user.role }, {
      action: "admin.login_mfa",
      entity: "admin",
      entityId: user.id,
      summary: `Admin MFA login ${user.email}`,
    });
    return sessionId;
  });

  await setSessionCookie(ADMIN_COOKIE, sessionId, ADMIN_SESSION_MS);
  jar.delete(ADMIN_MFA_COOKIE);
  return { ok: true as const };
}

export async function completeAdminMfaSetup(code: string, challengeIdRaw?: string) {
  const jar = await cookies();
  const challengeId = challengeIdRaw || jar.get(ADMIN_MFA_COOKIE)?.value;
  if (!challengeId) throw new PlatformError("MFA setup expired. Sign in again.", 401);

  const sessionId = await mutate((state) => {
    const challenge = (state.mfaChallenges ?? []).find((item) => item.id === challengeId);
    if (!challenge || new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new PlatformError("MFA setup expired. Sign in again.", 401);
    }
    if (challenge.purpose !== "setup" || !challenge.pendingSecret) {
      throw new PlatformError("No MFA setup in progress.", 400);
    }
    const user = state.adminUsers.find((item) => item.id === challenge.userId && item.active);
    if (!user) throw new PlatformError("Account not found.", 404);
    if (!verifyTotpCode(challenge.pendingSecret, code)) {
      throw new PlatformError("Invalid authenticator code.", 401);
    }
    user.mfaSecret = challenge.pendingSecret;
    user.mfaEnabled = true;
    user.mfaEnabledAt = new Date().toISOString();
    user.lastLoginAt = new Date().toISOString();
    state.mfaChallenges = (state.mfaChallenges ?? []).filter((item) => item.id !== challengeId);
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "admin",
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    });
    writeAudit(state, { id: user.id, email: user.email, role: user.role }, {
      action: "mfa.enroll",
      entity: "admin",
      entityId: user.id,
      summary: `Enrolled MFA for ${user.email} at login`,
    });
    return sessionId;
  });

  await setSessionCookie(ADMIN_COOKIE, sessionId, ADMIN_SESSION_MS);
  jar.delete(ADMIN_MFA_COOKIE);
  return { ok: true as const };
}

export async function beginMfaEnrollment(actorId: string) {
  return mutate((state) => {
    const user = state.adminUsers.find((item) => item.id === actorId && item.active);
    if (!user) throw new PlatformError("Account not found.", 404);
    if (user.mfaEnabled) throw new PlatformError("MFA is already enabled.");
    const secret = generateTotpSecret();
    const challengeId = createToken();
    state.mfaChallenges = state.mfaChallenges ?? [];
    state.mfaChallenges.push({
      id: challengeId,
      userId: user.id,
      purpose: "setup",
      pendingSecret: secret,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + MFA_CHALLENGE_MS).toISOString(),
    });
    return {
      challengeId,
      secret,
      otpauthUrl: buildOtpAuthUri({ secret, email: user.email }),
    };
  });
}

export async function confirmMfaEnrollment(actorId: string, challengeId: string, code: string) {
  return mutate((state) => {
    const user = state.adminUsers.find((item) => item.id === actorId && item.active);
    if (!user) throw new PlatformError("Account not found.", 404);
    const challenge = (state.mfaChallenges ?? []).find(
      (item) => item.id === challengeId && item.userId === actorId && item.purpose === "setup",
    );
    if (!challenge?.pendingSecret || new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new PlatformError("Enrollment expired. Start again.");
    }
    if (!verifyTotpCode(challenge.pendingSecret, code)) {
      throw new PlatformError("Invalid authenticator code.", 401);
    }
    user.mfaSecret = challenge.pendingSecret;
    user.mfaEnabled = true;
    user.mfaEnabledAt = new Date().toISOString();
    state.mfaChallenges = (state.mfaChallenges ?? []).filter((item) => item.id !== challengeId);
    writeAudit(state, { id: user.id, email: user.email, role: user.role }, {
      action: "mfa.enroll",
      entity: "admin",
      entityId: user.id,
      summary: `Enrolled MFA for ${user.email}`,
    });
    return { ok: true as const, mfaEnabled: true as const };
  });
}

export async function disableMfa(actorId: string, code: string) {
  return mutate((state) => {
    const user = state.adminUsers.find((item) => item.id === actorId && item.active);
    if (!user) throw new PlatformError("Account not found.", 404);
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new PlatformError("MFA is not enabled.");
    }
    if (adminMfaRequiredByPolicy() && (user.role === "owner" || user.role === "admin")) {
      throw new PlatformError("ADMIN_MFA_REQUIRED is on — owner/admin cannot disable MFA.");
    }
    if (!verifyTotpCode(user.mfaSecret, code)) {
      throw new PlatformError("Invalid authenticator code.", 401);
    }
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.mfaEnabledAt = undefined;
    writeAudit(state, { id: user.id, email: user.email, role: user.role }, {
      action: "mfa.disable",
      entity: "admin",
      entityId: user.id,
      summary: `Disabled MFA for ${user.email}`,
    });
    return { ok: true as const, mfaEnabled: false as const };
  });
}

export async function getMfaStatus(actorId: string) {
  return readPlatform((state) => {
    const user = state.adminUsers.find((item) => item.id === actorId);
    if (!user) throw new PlatformError("Account not found.", 404);
    return {
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaEnabledAt: user.mfaEnabledAt,
      policyRequired:
        adminMfaRequiredByPolicy() && (user.role === "owner" || user.role === "admin"),
      role: user.role,
    };
  });
}

export async function previewProductCsv(csvText: string) {
  return readPlatform((state) => {
    const catalog = mergeStockIntoCatalog(state);
    return parseProductCsv(csvText, catalog.products);
  });
}

export async function importProductCsv(csvText: string, actorId: string) {
  return mutate((state) => {
    const catalog = mergeStockIntoCatalog(state);
    const parsed = parseProductCsv(csvText, catalog.products);
    if (parsed.errors.length) {
      throw new PlatformError(
        `CSV has ${parsed.errors.length} validation error(s). Fix them before importing.`,
      );
    }
    const built = buildProductsFromCsv(parsed.rows, catalog.products);
    const now = new Date().toISOString();
    for (const product of built.products) {
      const existingIndex = state.catalog.products.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) state.catalog.products[existingIndex] = product;
      else state.catalog.products.unshift(product);
      for (const variant of product.variants) {
        const previous = state.stock[variant.id];
        state.stock[variant.id] = variant.stock;
        if (previous === undefined || previous !== variant.stock) {
          state.inventoryMovements.unshift({
            id: createId("mov"),
            variantId: variant.id,
            change: previous === undefined ? variant.stock : variant.stock - previous,
            type: "restock",
            actorId,
            reason: "CSV import",
            createdAt: now,
          });
        }
      }
    }
    writeAudit(state, auditActor(state, actorId), {
      action: "product.csv_import",
      entity: "product",
      summary: `CSV import: ${built.created} created, ${built.updated} updated`,
      meta: { created: built.created, updated: built.updated, skus: parsed.rows.map((row) => row.sku) },
    });
    return {
      created: built.created,
      updated: built.updated,
      products: built.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        variants: product.variants.length,
      })),
    };
  });
}

export async function exportProductCsv() {
  return readPlatform((state) => productsToCsv(mergeStockIntoCatalog(state).products));
}

export async function listAuditLogs(filters?: {
  action?: string;
  actorEmail?: string;
  entity?: string;
  q?: string;
  limit?: number;
}) {
  return readPlatform((state) => {
    const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 500);
    let rows = [...(state.auditLogs ?? [])];
    if (filters?.action) {
      const needle = filters.action.toLowerCase();
      rows = rows.filter((row) => row.action.toLowerCase().includes(needle));
    }
    if (filters?.actorEmail) {
      const needle = filters.actorEmail.toLowerCase();
      rows = rows.filter((row) => row.actorEmail.toLowerCase().includes(needle));
    }
    if (filters?.entity) {
      const needle = filters.entity.toLowerCase();
      rows = rows.filter((row) => row.entity.toLowerCase().includes(needle));
    }
    if (filters?.q) {
      const needle = filters.q.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.summary.toLowerCase().includes(needle) ||
          row.action.toLowerCase().includes(needle) ||
          row.actorEmail.toLowerCase().includes(needle) ||
          (row.entityId ?? "").toLowerCase().includes(needle),
      );
    }
    return rows.slice(0, limit) as AuditEntry[];
  });
}

export async function logout(kind: "customer" | "admin") {
  const name = kind === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (token) {
    await mutate((state) => {
      state.sessions = state.sessions.filter((session) => session.id !== token);
    });
  }
  jar.delete(name);
  if (kind === "admin") jar.delete(ADMIN_MFA_COOKIE);
}

async function setSessionCookie(name: string, value: string, maxAgeMs: number) {
  const jar = await cookies();
  jar.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

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
      mfaEnabled: Boolean(user.mfaEnabled),
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
  actorId?: string;
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
      writeAudit(state, auditActor(state, input.actorId), {
        action: "user.save",
        entity: "admin_user",
        entityId: user.id,
        summary: `Updated admin user ${user.email}`,
        meta: { role: user.role, active: user.active },
      });
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
    writeAudit(state, auditActor(state, input.actorId), {
      action: "user.save",
      entity: "admin_user",
      entityId: user.id,
      summary: `Created admin user ${user.email}`,
      meta: { role: user.role },
    });
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
    mfaEnabled: Boolean(user.mfaEnabled),
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

export async function attachStripePaymentIntent(orderNumber: string, paymentIntentId: string) {
  return mutate((state) => {
    const order = state.orders.find(
      (item) => item.orderNumber === orderNumber || item.orderNumber === orderNumber.toUpperCase(),
    );
    if (!order) throw new PlatformError("Order not found.", 404);
    order.stripePaymentIntentId = paymentIntentId;
    order.updatedAt = new Date().toISOString();
    return order;
  });
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
    if (stripeSessionId) {
      order.stripeSessionId = stripeSessionId;
      if (stripeSessionId.startsWith("pi_")) {
        order.stripePaymentIntentId = stripeSessionId;
      }
    }
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

/* ─── Circular wardrobe: take-back / repair / subscriptions ─── */

function emailMatches(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function listTakeBacks() {
  return readPlatform((state) =>
    [...(state.takeBacks ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listTakeBacksForCustomer(customerId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readPlatform((state) =>
    [...(state.takeBacks ?? [])]
      .filter(
        (item) =>
          item.customerId === customerId || item.customerEmail.toLowerCase() === normalized,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getTakeBackById(id: string, email?: string) {
  return readPlatform((state) => {
    const item = (state.takeBacks ?? []).find((entry) => entry.id === id);
    if (!item) return null;
    if (email && !emailMatches(item.customerEmail, email)) return null;
    return item;
  });
}

export async function createTakeBackRequest(input: {
  customerEmail: string;
  customerName: string;
  customerId?: string;
  phone?: string;
  items: { description: string; condition: TakeBackCondition; quantity: number }[];
  preferredPickupDate?: string;
  address?: string;
  city?: string;
  notes?: string;
}) {
  if (!input.items.length) throw new PlatformError("Add at least one garment.");
  return mutate((state) => {
    state.takeBacks = state.takeBacks ?? [];
    const now = new Date().toISOString();
    const request: TakeBackRequest = {
      id: createId("tb"),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerName: input.customerName.trim(),
      customerId: input.customerId,
      phone: input.phone?.trim() || undefined,
      items: input.items.map((item) => ({
        description: item.description.trim(),
        condition: item.condition,
        quantity: item.quantity,
      })),
      preferredPickupDate: input.preferredPickupDate || undefined,
      address: input.address?.trim() || undefined,
      city: input.city?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    };
    state.takeBacks.unshift(request);
    return request;
  });
}

export async function updateTakeBackRequest(
  id: string,
  patch: {
    status?: TakeBackStatus;
    creditEstimatePkr?: number;
    adminNote?: string;
    preferredPickupDate?: string;
  },
) {
  return mutate((state) => {
    const request = (state.takeBacks ?? []).find((item) => item.id === id);
    if (!request) throw new PlatformError("Take-back not found.", 404);
    const now = new Date().toISOString();
    if (patch.status) request.status = patch.status;
    if (typeof patch.creditEstimatePkr === "number") {
      request.creditEstimatePkr = patch.creditEstimatePkr;
    }
    if (patch.adminNote !== undefined) request.adminNote = patch.adminNote;
    if (patch.preferredPickupDate !== undefined) {
      request.preferredPickupDate = patch.preferredPickupDate || undefined;
    }
    request.updatedAt = now;
    return request;
  });
}

export async function listRepairs() {
  return readPlatform((state) =>
    [...(state.repairs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listRepairsForCustomer(customerId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readPlatform((state) =>
    [...(state.repairs ?? [])]
      .filter(
        (item) =>
          item.customerId === customerId || item.customerEmail.toLowerCase() === normalized,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getRepairById(id: string, email?: string) {
  return readPlatform((state) => {
    const item = (state.repairs ?? []).find((entry) => entry.id === id);
    if (!item) return null;
    if (email && !emailMatches(item.customerEmail, email)) return null;
    return item;
  });
}

export async function createRepairRequest(input: {
  customerEmail: string;
  customerName: string;
  customerId?: string;
  phone?: string;
  garmentDescription: string;
  issue: string;
  preferredDate?: string;
}) {
  return mutate((state) => {
    state.repairs = state.repairs ?? [];
    const now = new Date().toISOString();
    const request: RepairRequest = {
      id: createId("rp"),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerName: input.customerName.trim(),
      customerId: input.customerId,
      phone: input.phone?.trim() || undefined,
      garmentDescription: input.garmentDescription.trim(),
      issue: input.issue.trim(),
      preferredDate: input.preferredDate || undefined,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    };
    state.repairs.unshift(request);
    return request;
  });
}

export async function updateRepairRequest(
  id: string,
  patch: {
    status?: RepairStatus;
    quotePkr?: number;
    appointmentAt?: string;
    adminNote?: string;
  },
) {
  return mutate((state) => {
    const request = (state.repairs ?? []).find((item) => item.id === id);
    if (!request) throw new PlatformError("Repair request not found.", 404);
    const now = new Date().toISOString();
    if (patch.status) request.status = patch.status;
    if (typeof patch.quotePkr === "number") request.quotePkr = patch.quotePkr;
    if (patch.appointmentAt !== undefined) {
      request.appointmentAt = patch.appointmentAt || undefined;
    }
    if (patch.adminNote !== undefined) request.adminNote = patch.adminNote;
    request.updatedAt = now;
    return request;
  });
}

export async function listCircularSubscriptions() {
  return readPlatform((state) =>
    [...(state.circularSubscriptions ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
  );
}

export async function listCircularSubscriptionsForCustomer(customerId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  return readPlatform((state) =>
    [...(state.circularSubscriptions ?? [])]
      .filter(
        (item) =>
          item.customerId === customerId || item.customerEmail.toLowerCase() === normalized,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function getCircularSubscription(id: string) {
  return readPlatform(
    (state) => (state.circularSubscriptions ?? []).find((item) => item.id === id) ?? null,
  );
}

export function shouldUseMockCircularSubscription() {
  return circularSubscriptionsMockForced() || !stripeConfigured();
}

export async function createCircularSubscription(input: {
  planId: CircularPlanId;
  customerEmail: string;
  customerName: string;
  customerId?: string;
  /** When true (or Stripe unset / CIRCULAR_SUBSCRIPTIONS_MOCK), activate immediately. */
  mock?: boolean;
}) {
  const plan = getCircularPlan(input.planId);
  if (!plan) throw new PlatformError("Unknown circular plan.");
  const mock = input.mock ?? shouldUseMockCircularSubscription();
  return mutate((state) => {
    state.circularSubscriptions = state.circularSubscriptions ?? [];
    const email = input.customerEmail.trim().toLowerCase();
    const existingActive = state.circularSubscriptions.find(
      (item) =>
        item.planId === plan.id &&
        item.customerEmail === email &&
        (item.status === "active" || item.status === "pending"),
    );
    if (existingActive) {
      throw new PlatformError(
        existingActive.status === "active"
          ? "You already have an active subscription for this plan."
          : "A signup for this plan is already in progress.",
      );
    }
    const now = new Date().toISOString();
    const subscription: CircularSubscription = {
      id: createId("sub"),
      planId: plan.id,
      planName: plan.name,
      customerEmail: email,
      customerName: input.customerName.trim(),
      customerId: input.customerId,
      status: mock ? "active" : "pending",
      billingInterval: plan.billingInterval,
      pricePkr: plan.pricePkr,
      mock,
      createdAt: now,
      updatedAt: now,
    };
    state.circularSubscriptions.unshift(subscription);
    return subscription;
  });
}

export async function activateCircularSubscription(
  id: string,
  extras?: {
    stripeSessionId?: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  },
) {
  return mutate((state) => {
    const subscription = (state.circularSubscriptions ?? []).find((item) => item.id === id);
    if (!subscription) throw new PlatformError("Subscription not found.", 404);
    const now = new Date().toISOString();
    subscription.status = "active";
    subscription.updatedAt = now;
    if (extras?.stripeSessionId) subscription.stripeSessionId = extras.stripeSessionId;
    if (extras?.stripeSubscriptionId) {
      subscription.stripeSubscriptionId = extras.stripeSubscriptionId;
    }
    if (extras?.stripeCustomerId) subscription.stripeCustomerId = extras.stripeCustomerId;
    subscription.mock = false;
    return subscription;
  });
}

export async function updateCircularSubscription(
  id: string,
  patch: {
    status?: CircularSubscriptionStatus;
    stripeSessionId?: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  },
) {
  return mutate((state) => {
    const subscription = (state.circularSubscriptions ?? []).find((item) => item.id === id);
    if (!subscription) throw new PlatformError("Subscription not found.", 404);
    const now = new Date().toISOString();
    if (patch.status) {
      subscription.status = patch.status;
      if (patch.status === "cancelled") subscription.cancelledAt = now;
    }
    if (patch.stripeSessionId) subscription.stripeSessionId = patch.stripeSessionId;
    if (patch.stripeSubscriptionId) {
      subscription.stripeSubscriptionId = patch.stripeSubscriptionId;
    }
    if (patch.stripeCustomerId) subscription.stripeCustomerId = patch.stripeCustomerId;
    subscription.updatedAt = now;
    return subscription;
  });
}

export async function attachStripeSessionToSubscription(id: string, sessionId: string) {
  return updateCircularSubscription(id, { stripeSessionId: sessionId, status: "pending" });
}
