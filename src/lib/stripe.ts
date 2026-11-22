import Stripe from "stripe";
import type { Order } from "@/lib/order-model";
import { site } from "@/lib/site";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function stripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-11-18.endive" });
}

/** Charge amount in the smallest currency unit (USD cents). PKR totals convert via store usdRate. */
export function stripeChargeAmount(order: Order) {
  if (order.currency === "USD") {
    return {
      currency: "usd" as const,
      amount: Math.max(50, Math.round((order.totalPkr / site.usdRate) * 100)),
    };
  }
  return {
    currency: "usd" as const,
    amount: Math.max(50, Math.round((order.totalPkr / site.usdRate) * 100)),
  };
}

const REUSABLE_PI_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

function shippingForPaymentIntent(order: Order): Stripe.PaymentIntentCreateParams.Shipping | undefined {
  const postal = order.customer.postalCode?.trim();
  // BNPL methods (Afterpay etc.) reject shipping without postal_code — omit shipping until we have one.
  if (!postal) return undefined;
  return {
    name: order.customer.fullName,
    phone: order.customer.phone,
    address: {
      line1: order.customer.address,
      city: order.customer.city,
      state: order.customer.area,
      postal_code: postal,
      country: order.customer.country,
    },
  };
}

/**
 * Reuse an open PaymentIntent for the order when possible to avoid double charges.
 * Creates a new one only when none exists or the previous one is terminal/canceled.
 * `automatic_payment_methods` surfaces card, wallets, and BNPL when Dashboard allows.
 */
export async function getOrCreateStripePaymentIntent(order: Order) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  try {
    if (order.stripePaymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (existing.status === "succeeded" || existing.status === "processing") {
        return {
          ok: false as const,
          error:
            existing.status === "succeeded"
              ? "This order is already paid."
              : "Payment is still processing. Refresh the order page shortly.",
          status: existing.status,
          paymentIntentId: existing.id,
        };
      }
      if (REUSABLE_PI_STATUSES.has(existing.status) && existing.client_secret) {
        return {
          ok: true as const,
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          publishableKey: getStripePublishableKey(),
          reused: true as const,
        };
      }
    }

    const { currency, amount } = stripeChargeAmount(order);
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: order.customer.email,
      description: `${site.name} order ${order.orderNumber}`,
      metadata: {
        orderNumber: order.orderNumber,
      },
      automatic_payment_methods: {
        enabled: true,
      },
      shipping: shippingForPaymentIntent(order),
    });

    if (!intent.client_secret) {
      return { ok: false as const, error: "Stripe did not return a client secret." };
    }

    return {
      ok: true as const,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey: getStripePublishableKey(),
      reused: false as const,
    };
  } catch (error) {
    console.error("[stripe] payment intent", error);
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not create Stripe payment.",
    };
  }
}

/** @deprecated Prefer getOrCreateStripePaymentIntent — kept as alias for call sites. */
export async function createStripePaymentIntent(order: Order) {
  return getOrCreateStripePaymentIntent(order);
}

/** Hosted Checkout Session fallback (still includes automatic methods when Dashboard allows). */
export async function createStripeCheckoutSession(order: Order, origin: string) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  const { currency, amount } = stripeChargeAmount(order);

  // Hosted Checkout fallback. Wallets appear when the domain is verified in Stripe.
  // BNPL methods are listed when the Stripe account has them enabled; we omit forced
  // payment_method_types so Dashboard defaults apply (avoids inventing unavailable methods).
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customer.email,
    client_reference_id: order.orderNumber,
    metadata: {
      orderNumber: order.orderNumber,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: `${site.name} order ${order.orderNumber}`,
            description: order.items.map((item) => `${item.productTitle} ×${item.quantity}`).join(", "),
          },
        },
      },
    ],
    success_url: `${origin}/order/${order.orderNumber}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?stripe=cancelled&order=${order.orderNumber}`,
  });

  if (!session.url) {
    return { ok: false as const, error: "Stripe did not return a checkout URL." };
  }
  return { ok: true as const, url: session.url, sessionId: session.id };
}

export async function verifyStripeCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe is not configured." };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid = session.payment_status === "paid";
  const orderNumber = session.metadata?.orderNumber ?? session.client_reference_id ?? undefined;
  return {
    ok: true as const,
    paid,
    orderNumber: orderNumber ?? undefined,
    sessionId: session.id,
  };
}

export async function verifyStripePaymentIntent(paymentIntentId: string) {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe is not configured." };
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paid = intent.status === "succeeded";
  const processing = intent.status === "processing";
  const orderNumber = intent.metadata?.orderNumber || undefined;
  return {
    ok: true as const,
    paid,
    processing,
    orderNumber,
    paymentIntentId: intent.id,
    status: intent.status,
  };
}

export function constructStripeWebhookEvent(payload: string | Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return { ok: false as const, error: "Stripe webhook is not configured." };
  }
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return { ok: true as const, event };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Invalid Stripe signature.",
    };
  }
}

export function orderNumberFromStripeObject(
  object: Stripe.Checkout.Session | Stripe.PaymentIntent,
): string | undefined {
  const meta = object.metadata?.orderNumber;
  if (meta) return meta;
  if ("client_reference_id" in object && object.client_reference_id) {
    return object.client_reference_id;
  }
  return undefined;
}

export function circularSubscriptionIdFromStripeSession(
  session: Stripe.Checkout.Session,
): string | undefined {
  return session.metadata?.circularSubscriptionId ?? undefined;
}

/** Create a Stripe Checkout Session for a circular wardrobe subscription. */
export async function createCircularSubscriptionCheckoutSession(input: {
  subscriptionId: string;
  planName: string;
  planDescription: string;
  customerEmail: string;
  pricePkr: number;
  billingInterval: "month" | "year";
  stripePriceId?: string;
  origin: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  const unitAmount = Math.max(50, Math.round((input.pricePkr / site.usdRate) * 100));
  const lineItem = input.stripePriceId
    ? { price: input.stripePriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          recurring: { interval: input.billingInterval },
          product_data: {
            name: `${site.name} ${input.planName}`,
            description: input.planDescription,
          },
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.customerEmail,
    client_reference_id: input.subscriptionId,
    metadata: {
      circularSubscriptionId: input.subscriptionId,
    },
    line_items: [lineItem],
    success_url: `${input.origin}/circular/subscribe/success?session_id={CHECKOUT_SESSION_ID}&sub=${input.subscriptionId}`,
    cancel_url: `${input.origin}/circular/subscribe?cancelled=1&sub=${input.subscriptionId}`,
  });

  if (!session.url) {
    return { ok: false as const, error: "Stripe did not return a checkout URL." };
  }
  return { ok: true as const, url: session.url, sessionId: session.id };
}

export async function verifyCircularSubscriptionCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe is not configured." };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const complete = session.status === "complete";
  const subscriptionId =
    session.metadata?.circularSubscriptionId ?? session.client_reference_id ?? undefined;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  return {
    ok: true as const,
    complete,
    subscriptionId: subscriptionId ?? undefined,
    sessionId: session.id,
    stripeSubscriptionId,
    stripeCustomerId,
  };
}
