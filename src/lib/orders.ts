import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  PaymentMethod,
} from "@/lib/order-model";
import {
  createOrder as platformCreateOrder,
  getOrder as platformGetOrder,
  getStock as platformGetStock,
  listOrders as platformListOrders,
} from "@/lib/platform";

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

export async function getStock(variantId: string) {
  return platformGetStock(variantId);
}

export async function getOrder(orderNumber: string) {
  return platformGetOrder(orderNumber);
}

export async function listOrders() {
  return platformListOrders();
}

export async function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
  discountCode?: string;
  customerId?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  return platformCreateOrder(input);
}
