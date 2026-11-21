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

// TEMPORARY PARTIAL - will complete via push_files
export async function persistenceInfo() {
  return { neon: false, mode: "demo" as const };
}
