export type PaymentMethod = "cod" | "bank_transfer" | "card_demo";
export type OrderStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";

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
  customer: CheckoutCustomer;
  items: OrderLine[];
  subtotalPkr: number;
  shippingPkr: number;
  totalPkr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  currency: "PKR" | "USD";
};

export function whatsappOrderLink(order: Order) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923001234567";
  const text = encodeURIComponent(
    `Hi GarmentLoop, I placed order ${order.orderNumber} for ${order.customer.fullName}. Please confirm delivery to ${order.customer.city}.`,
  );
  return `https://wa.me/${number}?text=${text}`;
}
