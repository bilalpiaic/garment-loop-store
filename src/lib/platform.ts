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
import { createId, createToken } from "@/lib/ids";
import { slugify } from "@/lib/slug";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  CUSTOMER_OTP_CODE,
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
import { readFileState, writeFileState } from "@/lib/platform-file";
import { loadNeonState, neonAvailable, saveNeonState } from "@/lib/platform-neon";
import { mergeStockIntoCatalog, publicCatalog, type PlatformState } from "@/lib/platform-state";
import { can, type Permission, type Role } from "@/lib/roles";

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

async function run<T>(fn: MutateFn<T>, persist: boolean): Promise<T> {
  return withLock("platform", async () => {
    const state = neonAvailable() ? await loadNeonState() : readFileState();
    const seeded = await ensureSeed(state);
    const result = await fn(state);
    if (persist || seeded) {
      if (neonAvailable()) await saveNeonState(state);
      else writeFileState(state);
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
  pruneExpired(state);
  return changed;
}

function pruneExpired(state: PlatformState) {
  const now = Date.now();
  state.sessions = state.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  state.otp = state.otp.filter((item) => new Date(item.expiresAt).getTime() > now);
}

function shippingFor(state: PlatformState, subtotal: number, country: string) {
  const settings = state.settings;
  if (country !== "PK") return settings.internationalShippingPkr;
  if (subtotal >= settings.freeShippingThresholdPkr) return 0;
  return settings.domesticShippingPkr;
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
  discountCode?: string;
  customerId?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  try {
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
      const shippingPkr = shippingFor(state, subtotalPkr - discountPkr, input.customer.country);
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
        shippingPkr,
        discountPkr: discountPkr || undefined,
        totalPkr: subtotalPkr - discountPkr + shippingPkr,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        status,
        currency: input.currency,
        discountCode: code,
      };
      state.orders.unshift(order);
      return order;
    });
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
  return mutate((state) => {
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
    return order;
  });
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
      codeHash: sha256(`${email}:${CUSTOMER_OTP_CODE}`),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true as const, code: CUSTOMER_OTP_CODE };
}

export async function verifyCustomerOtp(emailRaw: string, code: string) {
  const email = emailRaw.trim().toLowerCase();
  if (code.trim() !== CUSTOMER_OTP_CODE) {
    throw new PlatformError("That code is incorrect. Use 123456.");
  }
  const sessionId = await mutate((state) => {
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
  const sessionId = await mutate(async (state) => {
    const user = state.adminUsers.find((item) => item.email === email);
    if (!user || !user.active) throw new PlatformError("Invalid email or password.", 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new PlatformError("Invalid email or password.", 401);
    user.lastLoginAt = new Date().toISOString();
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "admin",
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    });
    return sessionId;
  });
  await setSessionCookie(ADMIN_COOKIE, sessionId, ADMIN_SESSION_MS);
  return { ok: true as const };
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
  if (countryCode !== "PK") return settings.internationalShippingPkr;
  if (subtotalPkr >= settings.freeShippingThresholdPkr) return 0;
  return settings.domesticShippingPkr;
}
