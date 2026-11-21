import type {
  ProductReview,
  ReturnRequest,
  WishlistEntry,
} from "@/lib/commerce-types";
import type {
  Address,
  AdminUser,
  Customer,
  Discount,
  InventoryMovement,
  OtpChallenge,
  SessionRecord,
  StoreSettings,
} from "@/lib/identity";
import type { Order } from "@/lib/order-model";
import type { CatalogData, Product } from "@/lib/catalog";

export type ContentPage = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  updatedAt: string;
};

export type PlatformState = {
  version: 2;
  catalog: CatalogData;
  stock: Record<string, number>;
  orders: Order[];
  customers: Customer[];
  addresses: Address[];
  adminUsers: AdminUser[];
  sessions: SessionRecord[];
  otp: OtpChallenge[];
  discounts: Discount[];
  inventoryMovements: InventoryMovement[];
  settings: StoreSettings;
  orderSeq: number;
  reviews: ProductReview[];
  returns: ReturnRequest[];
  wishlists: Record<string, WishlistEntry[]>;
  pages: ContentPage[];
};

export function emptyPlatformState(
  catalog: CatalogData,
  settings: StoreSettings,
): PlatformState {
  const stock: Record<string, number> = {};
  for (const product of catalog.products) {
    for (const variant of product.variants) {
      stock[variant.id] = variant.stock;
    }
  }
  return {
    version: 2,
    catalog,
    stock,
    orders: [],
    customers: [],
    addresses: [],
    adminUsers: [],
    sessions: [],
    otp: [],
    discounts: [],
    inventoryMovements: [],
    settings,
    orderSeq: 0,
    reviews: [],
    returns: [],
    wishlists: {},
    pages: [],
  };
}

export function publishedProducts(catalog: CatalogData): Product[] {
  return catalog.products.filter((product) => (product.status ?? "published") === "published");
}
