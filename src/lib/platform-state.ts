import type { CatalogData } from "@/lib/catalog";
import type { AuditEntry } from "@/lib/audit";
import type {
  AdminUser,
  Customer,
  CustomerAddress,
  Discount,
  InventoryMovement,
  MfaChallenge,
  OtpChallenge,
  SessionRecord,
  StoreSettings,
} from "@/lib/identity";
import type {
  CircularSubscription,
  GiftCard,
  ProductQuestion,
  ProductReview,
  RepairRequest,
  ReturnRequest,
  TakeBackRequest,
  WishlistEntry,
} from "@/lib/commerce-types";
import type { Order, OrderTaxMeta } from "@/lib/order-model";
import { seedContentPages, seedDiscounts, seedGiftCards } from "@/lib/seed-demo";

export const PLATFORM_VERSION = 4;

export type ContentPage = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  updatedAt: string;
};

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
  settings: StoreSettings;
  orderSeq: number;
  reviews: ProductReview[];
  returns: ReturnRequest[];
  takeBacks: TakeBackRequest[];
  repairs: RepairRequest[];
  circularSubscriptions: CircularSubscription[];
  /** customerId → wishlist product ids */
  wishlists: Record<string, WishlistEntry[]>;
  pages: ContentPage[];
  auditLogs: AuditEntry[];
  mfaChallenges: MfaChallenge[];
  questions: ProductQuestion[];
  giftCards: GiftCard[];
  /**
   * Tax commit metadata keyed by orderNumber.
   * Used so MySQL/Neon can persist tax fields without ALTER-ing the orders table;
   * merged onto Order when loading.
   */
  orderTaxMeta: Record<string, OrderTaxMeta>;
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
    discounts: seedDiscounts(),
    inventoryMovements: [],
    settings: { ...settings },
    orderSeq: 0,
    reviews: seedReviews(catalog),
    returns: [],
    takeBacks: [],
    repairs: [],
    circularSubscriptions: [],
    wishlists: {},
    pages: seedContentPages(),
    auditLogs: [],
    mfaChallenges: [],
    questions: [],
    giftCards: seedGiftCards(),
    orderTaxMeta: {},
  };
}

function seedReviews(catalog: CatalogData): ProductReview[] {
  const first = catalog.products[0];
  const second = catalog.products[1];
  if (!first) return [];
  const now = new Date().toISOString();
  const reviews: ProductReview[] = [
    {
      id: "rev-seed-1",
      productId: first.id,
      productSlug: first.slug,
      authorName: "Ayesha K.",
      authorEmail: "ayesha@example.com",
      rating: 5,
      title: "Worth the weight",
      body: "Cut feels intentional and the fill still lofted after a month of city wear. Will keep this in rotation for years.",
      status: "approved",
      createdAt: now,
      moderatedAt: now,
    },
  ];
  if (second) {
    reviews.push({
      id: "rev-seed-2",
      productId: second.id,
      productSlug: second.slug,
      authorName: "Omar R.",
      authorEmail: "omar@example.com",
      rating: 4,
      title: "Quiet luxury, honest fabric",
      body: "Looks editorial without shouting. Size true; sleeves are generous for layering.",
      status: "approved",
      createdAt: now,
      moderatedAt: now,
    });
  }
  return reviews;
}

/** Sync Order tax fields ↔ orderTaxMeta map (call before persist / after load). */
export function syncOrderTaxMeta(state: PlatformState) {
  state.orderTaxMeta = state.orderTaxMeta ?? {};
  for (const order of state.orders) {
    if (order.taxSource || order.taxLabel || order.taxCommittedAt || order.taxTransactionId) {
      state.orderTaxMeta[order.orderNumber] = {
        taxSource: order.taxSource ?? "local",
        taxLabel: order.taxLabel ?? "Tax",
        taxNote: order.taxNote,
        taxTransactionId: order.taxTransactionId,
        taxCommittedAt: order.taxCommittedAt,
      };
    }
  }
  for (const [orderNumber, meta] of Object.entries(state.orderTaxMeta)) {
    const order = state.orders.find((item) => item.orderNumber === orderNumber);
    if (!order) continue;
    order.taxSource = order.taxSource ?? meta.taxSource;
    order.taxLabel = order.taxLabel ?? meta.taxLabel;
    order.taxNote = order.taxNote ?? meta.taxNote;
    order.taxTransactionId = order.taxTransactionId ?? meta.taxTransactionId;
    order.taxCommittedAt = order.taxCommittedAt ?? meta.taxCommittedAt;
  }
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
