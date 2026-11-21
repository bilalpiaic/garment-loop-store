import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { markOrderPaid } from "@/lib/platform";
import {
  constructStripeWebhookEvent,
  orderNumberFromStripeObject,
  stripeConfigured,
  stripeWebhookConfigured,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook: checkout.session.completed + payment_intent.succeeded.
 * Configure endpoint to this URL and set STRIPE_WEBHOOK_SECRET.
 * When Stripe keys/secret are missing, responds safely without mutating orders.
 * markOrderPaid sends the order confirmation email once when payment flips to paid.
 */
export async function POST(request: Request) {
  if (!stripeConfigured() || !stripeWebhookConfigured()) {
    return NextResponse.json(
      {
        received: true,
        noop: true,
        message: "Stripe webhook inactive — set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
      },
      { status: 200 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();
  const constructed = constructStripeWebhookEvent(payload, signature);
  if (!constructed.ok) {
    return NextResponse.json({ error: constructed.error }, { status: 400 });
  }

  const event = constructed.event;
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" || session.status === "complete") {
        const orderNumber = orderNumberFromStripeObject(session);
        if (orderNumber) {
          await markOrderPaid(orderNumber, session.id);
        }
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderNumber = orderNumberFromStripeObject(intent);
      if (orderNumber) {
        await markOrderPaid(orderNumber, intent.id);
      }
    }
  } catch (error) {
    console.error("[stripe:webhook]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handler failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, type: event.type });
}
