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

export const OTP_TTL_MS = 10 * 60 * 1000;
export const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function run<T>(fn: MutateFn<T>, persist: boolean): Promise<T> {
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

export async function mutate<T>(fn: MutateFn<T>): Promise<T> {
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

export function shippingFor(
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

export function applyDiscount(discount: Discount | undefined, subtotal: number) {
  if (!discount || !discount.active) return 0;
  if (discount.expiresAt && new Date(discount.expiresAt).getTime() < Date.now()) return 0;
  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return 0;
  if (discount.minOrderPkr && subtotal < discount.minOrderPkr) return 0;
  if (discount.type === "percentage") {
    return Math.min(subtotal, Math.round((subtotal * discount.value) / 100));
  }
  return Math.min(subtotal, discount.value);
}
