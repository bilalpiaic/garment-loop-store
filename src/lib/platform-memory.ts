import { categories, collections, products } from "@/lib/catalog";
import { DEFAULT_SETTINGS } from "@/lib/identity";
import { emptyPlatformState, type PlatformState } from "@/lib/platform-state";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Demo persistence when DATABASE_URL is unset:
 * - Local: prefer `.data/garmentloop-store.json`, fall back to `/tmp`
 * - Vercel/serverless: in-memory global (warm instance) + best-effort `/tmp` write
 * Neon is never required for the shoppable demo.
 */

const globalStore = globalThis as unknown as {
  __garmentloopPlatform?: PlatformState;
};

function seedCatalog() {
  return {
    products: products.map((product) => ({
      ...product,
      status: product.status ?? ("published" as const),
      variants: product.variants.map((variant) => ({ ...variant })),
    })),
    categories: categories.map((item) => ({ ...item })),
    collections: collections.map((item) => ({ ...item })),
  };
}

function candidatePaths() {
  const paths = [
    join(process.cwd(), ".data", "garmentloop-store.json"),
    "/tmp/garmentloop-store.json",
  ];
  return paths;
}

function hydrate(parsed: Partial<PlatformState>): PlatformState {
  const base = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  return {
    ...base,
    ...parsed,
    version: 2,
    catalog: parsed.catalog ?? base.catalog,
    stock: parsed.stock ?? base.stock,
    orders: parsed.orders ?? [],
    customers: parsed.customers ?? [],
    addresses: parsed.addresses ?? [],
    adminUsers: parsed.adminUsers ?? [],
    sessions: parsed.sessions ?? [],
    otp: parsed.otp ?? [],
    discounts: parsed.discounts?.length ? parsed.discounts : base.discounts,
    inventoryMovements: parsed.inventoryMovements ?? [],
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    orderSeq: parsed.orderSeq ?? parsed.orders?.length ?? 0,
    reviews: parsed.reviews?.length ? parsed.reviews : base.reviews,
    returns: parsed.returns ?? [],
    wishlists: parsed.wishlists ?? {},
    pages: parsed.pages?.length ? parsed.pages : base.pages ?? [],
    auditLogs: parsed.auditLogs ?? [],
    mfaChallenges: parsed.mfaChallenges ?? [],
  };
}

export function readDemoState(): PlatformState {
  if (globalStore.__garmentloopPlatform) {
    return globalStore.__garmentloopPlatform;
  }

  for (const file of candidatePaths()) {
    try {
      const parsed = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as Partial<PlatformState>;
      const state = hydrate(parsed);
      globalStore.__garmentloopPlatform = state;
      return state;
    } catch {
      /* try next */
    }
  }

  const state = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  globalStore.__garmentloopPlatform = state;
  return state;
}

export function writeDemoState(state: PlatformState) {
  globalStore.__garmentloopPlatform = state;
  for (const file of candidatePaths()) {
    try {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify(state));
      return;
    } catch (error) {
      console.warn("[platform] could not write demo store to", file, error);
    }
  }
}

export function demoPersistenceMode() {
  if (process.env.DATABASE_URL?.trim()) return "neon-optional";
  if (process.env.VERCEL) return "memory";
  return "file";
}
