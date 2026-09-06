import { readFileSync, writeFileSync } from "node:fs";
import { categories, collections, products } from "@/lib/catalog";
import { DEFAULT_SETTINGS } from "@/lib/identity";
import { emptyPlatformState, type PlatformState } from "@/lib/platform-state";
import { withLock } from "@/lib/lock";

const DATA_FILE = "/tmp/garmentloop-store.json";

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

export function readFileState(): PlatformState {
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Partial<PlatformState> & {
      orders?: PlatformState["orders"];
      stock?: Record<string, number>;
    };
    const base = emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
    return {
      ...base,
      ...parsed,
      version: 1,
      catalog: parsed.catalog ?? base.catalog,
      stock: parsed.stock ?? base.stock,
      orders: parsed.orders ?? [],
      customers: parsed.customers ?? [],
      addresses: parsed.addresses ?? [],
      adminUsers: parsed.adminUsers ?? [],
      sessions: parsed.sessions ?? [],
      otp: parsed.otp ?? [],
      discounts: parsed.discounts ?? [],
      inventoryMovements: parsed.inventoryMovements ?? [],
      tillSessions: parsed.tillSessions ?? [],
      tillMovements: parsed.tillMovements ?? [],
      expenses: parsed.expenses ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      orderSeq: parsed.orderSeq ?? parsed.orders?.length ?? 0,
    };
  } catch {
    return emptyPlatformState(seedCatalog(), DEFAULT_SETTINGS);
  }
}

export function writeFileState(state: PlatformState) {
  writeFileSync(DATA_FILE, JSON.stringify(state));
}

export async function withFileState<T>(
  fn: (state: PlatformState) => Promise<T> | T,
  options?: { persist?: boolean },
): Promise<T> {
  return withLock("file-platform", async () => {
    const state = readFileState();
    const result = await fn(state);
    if (options?.persist !== false) {
      writeFileState(state);
    }
    return result;
  });
}
