import { createId } from "@/lib/ids";
import type { Discount } from "@/lib/identity";
import type { Order } from "@/lib/order-model";
import type { ProductReview } from "@/lib/commerce-types";
import type { ContentPage, PlatformState } from "@/lib/platform-state";

export function seedDiscounts(): Discount[] {
  return [
    {
      id: "dsc-winter10",
      code: "WINTER10",
      description: "10% off winter essentials",
      type: "percentage",
      value: 10,
      minOrderPkr: 5000,
      usageLimit: 500,
      usedCount: 12,
      active: true,
    },
    {
      id: "dsc-welcome500",
      code: "WELCOME500",
      description: "PKR 500 off first order",
      type: "fixed",
      value: 500,
      minOrderPkr: 3000,
      usageLimit: 1000,
      usedCount: 48,
      active: true,
    },
  ];
}

export function seedContentPages(): ContentPage[] {
  return [
    {
      slug: "sustainability",
      title: "Sustainability",
      excerpt: "Circular wardrobe principles for garments that stay in the loop.",
      body: `GarmentLoop designs for longevity first: denser cloth, repairable construction, and honest materials.\n\nTake-back, atelier repair bookings, and recycling subscriptions are live in the circular hub (/circular): request pickup, track status, and join Care / Repair+ / Recycle Loop memberships (Stripe when keyed; mock signup otherwise).\n\nEvery collection is cut in smaller runs so we buy less fabric waste and can stand behind fit.`,
      updatedAt: new Date().toISOString(),
    },
    {
      slug: "privacy",
      title: "Privacy policy",
      excerpt: "How we handle account and order data.",
      body: `We collect only what we need to fulfill orders: name, email, phone, and shipping address.\n\nPayment card data is never stored on GarmentLoop servers — Stripe (when enabled) tokenizes cards. OTP codes are short-lived.\n\nYou may request data export or deletion by emailing hello@garmentloop.store.`,
      updatedAt: new Date().toISOString(),
    },
    {
      slug: "terms",
      title: "Terms of sale",
      excerpt: "Purchase terms for the GarmentLoop storefront.",
      body: `Orders are confirmed when payment clears or COD is accepted. Prices are shown in PKR (USD display is approximate).\n\nRisk of loss transfers on delivery. Unused items may be returned within 30 days via your account returns portal.\n\nDemo card payments do not charge a real card.`,
      updatedAt: new Date().toISOString(),
    },
    {
      slug: "shipping",
      title: "Shipping & returns",
      excerpt: "Zone rates, ETAs, and how returns work.",
      body: `Pakistan: standard (often free over the store threshold) or express. GCC and international air options appear at checkout.\n\nDuties may apply on international arrivals.\n\nReturns: sign in, open a delivered or shipped order, select items and a reason. Our atelier reviews every RMA.`,
      updatedAt: new Date().toISOString(),
    },
  ];
}

/** Believable sample orders for admin walkthrough when the store is empty. */
export function seedSampleOrders(state: PlatformState): Order[] {
  const now = Date.now();
  const pick = (index: number) => {
    const product = state.catalog.products[index % state.catalog.products.length];
    const variant = product?.variants.find((item) => (state.stock[item.id] ?? item.stock) > 0) ?? product?.variants[0];
    if (!product || !variant) return null;
    return { product, variant };
  };

  const samples: Omit<Order, "orderNumber">[] = [];
  const configs: { status: Order["status"]; payment: Order["paymentStatus"]; method: Order["paymentMethod"]; daysAgo: number }[] = [
    { status: "delivered", payment: "paid", method: "cod", daysAgo: 12 },
    { status: "shipped", payment: "paid", method: "card_demo", daysAgo: 3 },
    { status: "processing", payment: "pending", method: "bank_transfer", daysAgo: 1 },
    { status: "confirmed", payment: "pending", method: "cod", daysAgo: 0 },
  ];

  configs.forEach((config, index) => {
    const a = pick(index);
    const b = pick(index + 2);
    if (!a) return;
    const items = [
      {
        variantId: a.variant.id,
        productId: a.product.id,
        productTitle: a.product.title,
        slug: a.product.slug,
        color: a.variant.color,
        size: a.variant.size,
        image: a.product.images[0]?.src ?? "",
        quantity: 1,
        unitPricePkr: a.variant.salePricePkr ?? a.variant.pricePkr,
        totalPkr: a.variant.salePricePkr ?? a.variant.pricePkr,
      },
    ];
    if (b && b.variant.id !== a.variant.id) {
      items.push({
        variantId: b.variant.id,
        productId: b.product.id,
        productTitle: b.product.title,
        slug: b.product.slug,
        color: b.variant.color,
        size: b.variant.size,
        image: b.product.images[0]?.src ?? "",
        quantity: 1,
        unitPricePkr: b.variant.salePricePkr ?? b.variant.pricePkr,
        totalPkr: b.variant.salePricePkr ?? b.variant.pricePkr,
      });
    }
    const subtotalPkr = items.reduce((sum, line) => sum + line.totalPkr, 0);
    const shippingPkr = subtotalPkr >= state.settings.freeShippingThresholdPkr ? 0 : state.settings.domesticShippingPkr;
    const taxPkr = Math.round(subtotalPkr * 0.05);
    const createdAt = new Date(now - config.daysAgo * 86400000).toISOString();
    samples.push({
      createdAt,
      updatedAt: createdAt,
      customer: {
        fullName: ["Sara Malik", "Hassan Ali", "Nina Chen", "Bilal Khan"][index]!,
        email: ["sara@example.com", "hassan@example.com", "nina@example.com", "bilal@example.com"][index]!,
        phone: "+92 300 555000" + index,
        country: "PK",
        city: ["Lahore", "Karachi", "Islamabad", "Lahore"][index]!,
        area: "Demo Area",
        address: `${10 + index} Circular Atelier Road`,
      },
      items,
      subtotalPkr,
      shippingPkr,
      taxPkr,
      totalPkr: subtotalPkr + shippingPkr + taxPkr,
      paymentMethod: config.method,
      paymentStatus: config.payment,
      status: config.status,
      currency: "PKR",
      shippingMethodId: "pk-standard",
      shippingLabel: shippingPkr === 0 ? "Standard (free)" : "Standard",
      trackingNumber: config.status === "shipped" || config.status === "delivered" ? `GLTRACK${1000 + index}` : undefined,
      courier: config.status === "shipped" || config.status === "delivered" ? "TCS" : undefined,
    });
  });

  return samples.map((order, index) => ({
    ...order,
    orderNumber: `GL-DEMO-${String(index + 1).padStart(3, "0")}`,
  }));
}

export function ensureDemoWalkthrough(state: PlatformState) {
  let changed = false;
  if (!state.discounts.length) {
    state.discounts = seedDiscounts();
    changed = true;
  }
  if (!state.pages?.length) {
    state.pages = seedContentPages();
    changed = true;
  }
  if (!state.orders.length) {
    const orders = seedSampleOrders(state);
    state.orders = orders;
    state.orderSeq = Math.max(state.orderSeq, orders.length);
    for (const order of orders) {
      const email = order.customer.email.toLowerCase();
      if (!state.customers.some((customer) => customer.email === email)) {
        state.customers.push({
          id: createId("cus"),
          email,
          phone: order.customer.phone,
          fullName: order.customer.fullName,
          createdAt: order.createdAt,
        });
      }
    }
    changed = true;
  }
  if (!(state.reviews ?? []).some((review) => review.status === "pending")) {
    const product = state.catalog.products[2] ?? state.catalog.products[0];
    if (product) {
      const pending: ProductReview = {
        id: "rev-seed-pending",
        productId: product.id,
        productSlug: product.slug,
        authorName: "Guest Reviewer",
        authorEmail: "guest@example.com",
        rating: 5,
        title: "Awaiting moderation",
        body: "Sample pending review so the admin moderation queue is not empty on a fresh demo.",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      state.reviews = [pending, ...(state.reviews ?? [])];
      changed = true;
    }
  }
  return changed;
}
