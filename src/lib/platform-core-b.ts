import {
  PlatformError,
  mutate,
  readPlatform,
  applyDiscount,
  shippingFor,
} from "@/lib/platform-core-a";
import { createId } from "@/lib/ids";
import { getVariant } from "@/lib/catalog";
import type { Discount } from "@/lib/identity";
import type {
  CheckoutCustomer,
  CheckoutItem,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/order-model";
import type { PlatformState } from "@/lib/platform-state";
import { estimateTaxPkr } from "@/lib/tax";
import { stripeConfigured } from "@/lib/stripe";
import { sendOrderConfirmation } from "@/lib/email";

export async function createOrder(input: {
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  currency: "PKR" | "USD";
  shippingMethodId: string;
  discountCode?: string;
  customerId?: string;
}): Promise<{ ok: true; order: Order } | { ok: false; error: string }> {
  try {
    if (input.paymentMethod === "stripe" && !stripeConfigured()) {
      return { ok: false, error: "Card payments are unavailable. Choose COD, bank transfer, or card demo." };
    }
    const order = await mutate((state) => {
      if (input.items.length === 0) {
        throw new PlatformError("Your cart is empty.");
      }
      const lines: OrderLine[] = [];
      for (const item of input.items) {
        if (item.quantity < 1) throw new PlatformError("Invalid quantity.");
        const match = getVariant(item.variantId, state.catalog.products);
        if (!match) throw new PlatformError("One of the items is no longer available.");
        const available = state.stock[item.variantId] ?? match.variant.stock;
        if (available < item.quantity) {
          throw new PlatformError(
            `${match.product.title} (${match.variant.color}, ${match.variant.size}) is out of stock.`,
          );
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
      const code = input.discountCode?.trim().toUpperCase();
      const discount = code
        ? state.discounts.find((item) => item.code.toUpperCase() === code)
        : undefined;
      if (code && !discount) {
        throw new PlatformError("That discount code is not valid.");
      }
      const discountPkr = applyDiscount(discount, subtotalPkr);
      const afterDiscount = subtotalPkr - discountPkr;
      const shipping = shippingFor(state, afterDiscount, input.customer.country, input.shippingMethodId);
      const taxPkr = estimateTaxPkr(afterDiscount, input.customer.country);
      const paymentStatus: PaymentStatus =
        input.paymentMethod === "card_demo" ? "paid" : "pending";
      const status: OrderStatus =
        input.paymentMethod === "cod" || input.paymentMethod === "card_demo"
          ? "confirmed"
          : "pending";

      const customer = upsertCustomer(state, input.customer, input.customerId);

      state.orderSeq += 1;
      const orderNumber = `GL-${String(state.orderSeq).padStart(4, "0")}`;
      const now = new Date().toISOString();

      for (const line of lines) {
        const current = state.stock[line.variantId] ?? 0;
        if (current < line.quantity) {
          throw new PlatformError("One of the items is out of stock.");
        }
        state.stock[line.variantId] = current - line.quantity;
        state.inventoryMovements.unshift({
          id: createId("mov"),
          variantId: line.variantId,
          change: -line.quantity,
          type: "sale",
          relatedOrderNumber: orderNumber,
          createdAt: now,
        });
      }

      if (discount) {
        discount.usedCount += 1;
      }

      const order: Order = {
        orderNumber,
        createdAt: now,
        updatedAt: now,
        customerId: customer.id,
        customer: input.customer,
        items: lines,
        subtotalPkr,
        shippingPkr: shipping.amountPkr,
        taxPkr,
        discountPkr: discountPkr || undefined,
        totalPkr: afterDiscount + shipping.amountPkr + taxPkr,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        status,
        currency: input.currency,
        shippingMethodId: shipping.id,
        shippingLabel: shipping.label,
        discountCode: code,
      };
      state.orders.unshift(order);
      return order;
    });
    // Stripe confirmation email fires after payment (webhook / confirm). Others send now.
    if (order.paymentMethod !== "stripe") {
      await sendOrderConfirmation(order).catch((error) => console.error("[email]", error));
    }
    return { ok: true, order };
  } catch (error) {
    if (error instanceof PlatformError) {
      return { ok: false, error: error.message };
    }
    console.error("Checkout failed", error);
    return { ok: false, error: "Could not place the order. Please try again." };
  }
}

function upsertCustomer(state: PlatformState, details: CheckoutCustomer, customerId?: string) {
  const email = details.email.trim().toLowerCase();
  let customer =
    (customerId ? state.customers.find((item) => item.id === customerId) : undefined) ??
    state.customers.find((item) => item.email === email);
  if (!customer) {
    customer = {
      id: createId("cus"),
      email,
      phone: details.phone,
      fullName: details.fullName,
      createdAt: new Date().toISOString(),
    };
    state.customers.unshift(customer);
  } else {
    customer.phone = details.phone || customer.phone;
    customer.fullName = details.fullName || customer.fullName;
  }

  const duplicate = state.addresses.find(
    (address) =>
      address.customerId === customer.id &&
      address.address === details.address &&
      address.city === details.city,
  );
  if (!duplicate) {
    if (!state.addresses.some((address) => address.customerId === customer.id && address.isDefault)) {
      state.addresses.unshift({
        id: createId("adr"),
        customerId: customer.id,
        fullName: details.fullName,
        phone: details.phone,
        country: details.country,
        city: details.city,
        area: details.area,
        address: details.address,
        isDefault: true,
      });
    }
  }
  return customer;
}

export async function getOrder(orderNumber: string) {
  return readPlatform((state) =>
    state.orders.find((order) => order.orderNumber === orderNumber.toUpperCase()),
  );
}

export async function listOrders() {
  return readPlatform((state) =>
    [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}
