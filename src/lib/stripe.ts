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

/** Create a Stripe Checkout Session for an existing pending order. */
export async function createStripeCheckoutSession(order: Order, origin: string) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  const currency = order.currency.toLowerCase();
  const amount =
    currency === "usd"
      ? Math.max(50, Math.round((order.totalPkr / site.usdRate) * 100))
      : Math.max(100, order.totalPkr * 100); // PKR in paisa if Stripe supports; fallback uses smallest unit

  // Stripe may not support PKR in all accounts — prefer USD line when currency is USD,
  // otherwise charge a single line in the order currency when available.
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
          currency: currency === "usd" ? "usd" : "usd",
          unit_amount:
            currency === "usd"
              ? amount
              : Math.max(50, Math.round((order.totalPkr / site.usdRate) * 100)),
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
