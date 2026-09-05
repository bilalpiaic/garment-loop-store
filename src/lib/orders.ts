import { databaseUrl } from "@/db/client";
import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  PaymentMethod,
} from "@/lib/order-model";
import * as fileStore from "@/lib/orders-file";
import * as neonStore from "@/lib/orders-neon";

export type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/order-model";
export { whatsappOrderLink } from "@/lib/order-model";

const MISSING_DB =
  "Orders need a Neon database. Set DATABASE_URL on Vercel, then redeploy.";

export async function getStock(variantId: string) {
  if (databaseUrl()) {
    return neonStore.getStock(variantId);
  }
  return fileStore.getStock(variantId);
}

export async function getOrder(orderNumber: string) {
  if (databaseUrl()) {
    return neonStore.getOrder(orderNumber);
  }
  return fileStore.getOrder(orderNumber);
}

export async function listOrders() {
  if (databaseUrl()) {
    return neonStore.listOrders();
  }
  return fileStore.listOrders();
}

export async function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  if (databaseUrl()) {
    return neonStore.createOrder(input);
  }
  if (process.env.VERCEL) {
    return { ok: false, error: MISSING_DB };
  }
  return fileStore.createOrder(input);
}
