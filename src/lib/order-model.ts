export type PaymentMethod = "cod" | "bank_transfer" | "card_demo";
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
  discountPkr?: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  currency: "PKR" | "USD";
  trackingNumber?: string;
  courier?: string;
  notes?: string;
  discountCode?: string;
};

export function whatsappOrderLink(order: Order) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923001234567";
  const text = encodeURIComponent(
    `Hi GarmentLoop, I placed order ${order.orderNumber} for ${order.customer.fullName}. Please confirm delivery to ${order.customer.city}.`,
  );
  return `https://wa.me/${number}?text=${text}`;
}
