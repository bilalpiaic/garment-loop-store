import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { attachStripePaymentIntent } from "@/lib/platform";
import { getOrCreateStripePaymentIntent, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({
  orderNumber: z.string().min(1),
});

/** Reuse or create a PaymentIntent for a pending Stripe order (avoids duplicate charges). */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Order number required." }, { status: 400 });
  }

  const order = await getOrder(parsed.data.orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.paymentMethod !== "stripe") {
    return NextResponse.json({ error: "This order is not a Stripe payment." }, { status: 400 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }

  const intent = await getOrCreateStripePaymentIntent(order);
  if (!intent.ok) {
    const status = "status" in intent ? intent.status : undefined;
    if (status === "processing") {
      return NextResponse.json(
        {
          error: intent.error,
          status,
          paymentIntentId: "paymentIntentId" in intent ? intent.paymentIntentId : undefined,
          processing: true,
        },
        { status: 202 },
      );
    }
    return NextResponse.json({ error: intent.error, status }, { status: status === "succeeded" ? 409 : 502 });
  }

  if (!intent.reused) {
    await attachStripePaymentIntent(order.orderNumber, intent.paymentIntentId);
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.paymentIntentId,
    publishableKey: intent.publishableKey,
    reused: intent.reused,
  });
}
