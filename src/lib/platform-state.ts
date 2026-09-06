import type { CatalogData } from "@/lib/catalog";
import type {
  AdminUser,
  Customer,
  CustomerAddress,
  Discount,
  InventoryMovement,
  OtpChallenge,
  SessionRecord,
  StoreSettings,
} from "@/lib/identity";
import type { Order } from "@/lib/order-model";
import type { Expense, TillMovement, TillSession } from "@/lib/till";

export const PLATFORM_VERSION = 1;

export type PlatformState = {
  version: number;
  catalog: CatalogData;
  stock: Record<string, number>;
  orders: Order[];
  customers: Customer[];
  addresses: CustomerAddress[];
  adminUsers: AdminUser[];
  sessions: SessionRecord[];
  otp: OtpChallenge[];
  discounts: Discount[];
  inventoryMovements: InventoryMovement[];
  tillSessions: TillSession[];
  tillMovements: TillMovement[];
  expenses: Expense[];
  settings: StoreSettings;
  orderSeq: number;
};

export function emptyPlatformState(catalog: CatalogData, settings: StoreSettings): PlatformState {
  const stock: Record<string, number> = {};
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      stock[variant.id] = variant.stock;
    }
  }
  return {
    version: PLATFORM_VERSION,
    catalog: {
      products: catalog.products.map((product) => ({
        ...product,
        status: product.status ?? "published",
        variants: product.variants.map((variant) => ({ ...variant })),
      })),
      categories: catalog.categories.map((item) => ({ ...item })),
      collections: catalog.collections.map((item) => ({ ...item })),
    },
    stock,
    orders: [],
    customers: [],
    addresses: [],
    adminUsers: [],
    sessions: [],
    otp: [],
    discounts: [],
    inventoryMovements: [],
    tillSessions: [],
    tillMovements: [],
    expenses: [],
    settings: { ...settings },
    orderSeq: 0,
  };
}

export function mergeStockIntoCatalog(state: PlatformState): CatalogData {
  return {
    categories: state.catalog.categories,
    collections: state.catalog.collections,
    products: state.catalog.products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        stock: state.stock[variant.id] ?? variant.stock,
      })),
    })),
  };
}

export function publicCatalog(state: PlatformState): CatalogData {
  const merged = mergeStockIntoCatalog(state);
  return {
    categories: merged.categories,
    collections: merged.collections,
    products: merged.products.filter((product) => product.status !== "draft" && product.status !== "archived"),
  };
}
