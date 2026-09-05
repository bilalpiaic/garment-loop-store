import { getVariant } from "@/lib/catalog";
import { shippingCostPkr } from "@/lib/money";

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

const orders = new Map<string, Order>();
const stockOverrides = new Map<string, number>();

export function getStock(variantId: string) {
  if (stockOverrides.has(variantId)) {
    return stockOverrides.get(variantId) ?? 0;
  }
  return getVariant(variantId)?.variant.stock ?? 0;
}

function decrementStock(variantId: string, quantity: number) {
  const current = getStock(variantId);
  if (current < quantity) {
    return false;
  }
  stockOverrides.set(variantId, current - quantity);
  return true;
}

function nextOrderNumber() {
  const n = orders.size + 1;
  return `GL-${String(n).padStart(4, "0")}`;
}

export function getOrder(orderNumber: string) {
  return orders.get(orderNumber.toUpperCase());
}

export function listOrders() {
  return [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
}): { ok: true; order: Order } | { ok: false; error: string } {
  if (input.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const lines: OrderLine[] = [];
  for (const item of input.items) {
    if (item.quantity < 1) {
      return { ok: false, error: "Invalid quantity." };
    }
    const match = getVariant(item.variantId);
    if (!match) {
      return { ok: false, error: "One of the items is no longer available." };
    }
    const stock = getStock(item.variantId);
    if (stock < item.quantity) {
      return {
        ok: false,
        error: `${match.product.title} (${match.variant.color}, ${match.variant.size}) is out of stock.`,
      };
    }
    const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
    lines.push({
      variantId: match.variant.id,
      productId: match.product.id,
      productTitle: match.product.title,
      slug: match.product.slug,
      color: match.variant.color,
      size: match.variant.size,
      image: match.product.images[0]?.src ?? "",
      quantity: item.quantity,
      unitPricePkr: unit,
      totalPkr: unit * item.quantity,
    });
  }

  const subtotalPkr = lines.reduce((sum, line) => sum + line.totalPkr, 0);
  const shippingPkr = shippingCostPkr(subtotalPkr, input.customer.country);
  const paymentStatus: PaymentStatus =
    input.paymentMethod === "card_demo" ? "paid" : "pending";
  const status: OrderStatus =
    input.paymentMethod === "cod" || input.paymentMethod === "card_demo"
      ? "confirmed"
      : "pending";

  for (const line of lines) {
    decrementStock(line.variantId, line.quantity);
  }

  const order: Order = {
    orderNumber: nextOrderNumber(),
    createdAt: new Date().toISOString(),
    customer: input.customer,
    items: lines,
    subtotalPkr,
    shippingPkr,
    totalPkr: subtotalPkr + shippingPkr,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    status,
    currency: input.currency,
  };

  orders.set(order.orderNumber, order);
  return { ok: true, order };
}

export function whatsappOrderLink(order: Order) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923001234567";
  const text = encodeURIComponent(
    `Hi GarmentLoop, I placed order ${order.orderNumber} for ${order.customer.fullName}. Please confirm delivery to ${order.customer.city}.`,
  );
  return `https://wa.me/${number}?text=${text}`;
}
