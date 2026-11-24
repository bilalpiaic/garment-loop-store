import { readFileSync, writeFileSync } from "node:fs";
import { getVariant } from "@/lib/catalog";
import { rejectCardDemoIfDisallowed } from "@/lib/card-demo";
import { createToken } from "@/lib/ids";
import { shippingCostPkr } from "@/lib/money";
import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/order-model";

const DATA_FILE = "/tmp/garmentloop-store.json";

type DiskState = {
  orders: Order[];
  stock: Record<string, number>;
};

function loadDisk(): DiskState {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf8")) as DiskState;
  } catch {
    return { orders: [], stock: {} };
  }
}

function saveDisk(state: DiskState) {
  writeFileSync(DATA_FILE, JSON.stringify(state));
}

export function getStock(variantId: string) {
  const disk = loadDisk();
  if (variantId in disk.stock) {
    return disk.stock[variantId] ?? 0;
  }
  return getVariant(variantId)?.variant.stock ?? 0;
}

function decrementStock(state: DiskState, variantId: string, quantity: number) {
  const current =
    variantId in state.stock
      ? (state.stock[variantId] ?? 0)
      : (getVariant(variantId)?.variant.stock ?? 0);
  if (current < quantity) {
    return false;
  }
  state.stock[variantId] = current - quantity;
  return true;
}

function nextOrderNumber(state: DiskState) {
  const n = state.orders.length + 1;
  return `GL-${String(n).padStart(4, "0")}`;
}

export function getOrder(orderNumber: string) {
  return loadDisk().orders.find((order) => order.orderNumber === orderNumber.toUpperCase());
}

export function listOrders() {
  return [...loadDisk().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
}): { ok: true; order: Order } | { ok: false; error: string } {
  const cardDemoBlock = rejectCardDemoIfDisallowed(input.paymentMethod);
  if (cardDemoBlock) {
    return { ok: false, error: cardDemoBlock };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const state = loadDisk();
  const lines: OrderLine[] = [];
  for (const item of input.items) {
    if (item.quantity < 1) {
      return { ok: false, error: "Invalid quantity." };
    }
    const match = getVariant(item.variantId);
    if (!match) {
      return { ok: false, error: "One of the items is no longer available." };
    }
    const stock =
      item.variantId in state.stock
        ? (state.stock[item.variantId] ?? 0)
        : match.variant.stock;
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
    decrementStock(state, line.variantId, line.quantity);
  }

  const order: Order = {
    orderNumber: nextOrderNumber(state),
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
    accessToken: createToken(),
  };

  state.orders.push(order);
  saveDisk(state);
  return { ok: true, order };
}
