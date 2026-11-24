export type PaymentMethod = "cod" | "bank_transfer" | "card_demo" | "stripe";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export type CheckoutItem = {
  variantId: string;
  quantity: number;
};

export type CheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  address: string;
  /** Optional; useful for EasyPost rates and Stripe wallets/BNPL. */
  postalCode?: string;
  notes?: string;
};

export type OrderLine = {
  variantId: string;
  productId: string;
  productTitle: string;
  slug: string;
  color: string;
  size: string;
  image: string;
  quantity: number;
  unitPricePkr: number;
  totalPkr: number;
};

export type Order = {
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  customerId?: string;
  customer: CheckoutCustomer;
  items: OrderLine[];
  subtotalPkr: number;
  shippingPkr: number;
  taxPkr?: number;
  discountPkr?: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  currency: "PKR" | "USD";
  shippingMethodId?: string;
  shippingLabel?: string;
  trackingNumber?: string;
  courier?: string;
  notes?: string;
  discountCode?: string;
  stripeSessionId?: string;
  /** Reused across pay-page reloads to avoid duplicate charges. */
  stripePaymentIntentId?: string;
  /** Opaque capability token for guest order confirmation / pay links. */
  accessToken?: string;
};

export function whatsappOrderLink(order: Order) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923001234567";
  const text = encodeURIComponent(
    `Hi GarmentLoop, I placed order ${order.orderNumber} for ${order.customer.fullName}. Please confirm delivery to ${order.customer.city}.`,
  );
  return `https://wa.me/${number}?text=${text}`;
}

/** Guest confirmation / pay URL with opaque access token. */
export function orderAccessPath(orderNumber: string, accessToken?: string, suffix = "") {
  const base = `/order/${encodeURIComponent(orderNumber)}${suffix}`;
  if (!accessToken) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}t=${encodeURIComponent(accessToken)}`;
}
