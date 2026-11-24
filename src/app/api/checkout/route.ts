import { NextResponse } from "next/server";
import { rejectCardDemoIfDisallowed } from "@/lib/card-demo";
import { checkoutSchema } from "@/lib/checkout-schema";
import { createOrder } from "@/lib/orders";
import { orderAccessPath } from "@/lib/order-model";
import { attachStripePaymentIntent, getCustomerSession } from "@/lib/platform";
import {
  createStripeCheckoutSession,
  getOrCreateStripePaymentIntent,
  stripeConfigured,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid checkout details." },
      { status: 400 },
    );
  }

  const cardDemoBlock = rejectCardDemoIfDisallowed(parsed.data.paymentMethod);
  if (cardDemoBlock) {
    return NextResponse.json({ error: cardDemoBlock }, { status: 400 });
  }

  if (parsed.data.paymentMethod === "stripe" && !stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe keys are not configured. Use COD or bank transfer." },
      { status: 400 },
    );
  }

  const session = await getCustomerSession();
  const postalCode = parsed.data.postalCode?.trim() || undefined;

  const result = await createOrder({
    items: parsed.data.items,
    customer: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      country: parsed.data.country,
      city: parsed.data.city,
      area: parsed.data.area,
      address: parsed.data.address,
      postalCode,
      notes: parsed.data.notes,
    },
    paymentMethod: parsed.data.paymentMethod,
    currency: parsed.data.currency,
    shippingMethodId: parsed.data.shippingMethodId,
    discountCode: parsed.data.discountCode,
    customerId: session?.customer.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  if (parsed.data.paymentMethod === "stripe") {
    const origin = new URL(request.url).origin;
    const intent = await getOrCreateStripePaymentIntent(result.order);
    if (intent.ok) {
      const order = intent.reused
        ? result.order
        : await attachStripePaymentIntent(result.order.orderNumber, intent.paymentIntentId);
      return NextResponse.json({
        orderNumber: order.orderNumber,
        order,
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
        publishableKey: intent.publishableKey,
        payPath: orderAccessPath(order.orderNumber, order.accessToken, "/pay"),
      });
    }

    // Fallback to hosted Checkout if PaymentIntent creation fails.
    const checkout = await createStripeCheckoutSession(result.order, origin);
    if (!checkout.ok) {
      return NextResponse.json(
        {
          error: intent.error || checkout.error,
          orderNumber: result.order.orderNumber,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      orderNumber: result.order.orderNumber,
      order: result.order,
      checkoutUrl: checkout.url,
    });
  }

  return NextResponse.json({ orderNumber: result.order.orderNumber, order: result.order });
}
