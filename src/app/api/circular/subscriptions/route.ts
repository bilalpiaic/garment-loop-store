import { NextResponse } from "next/server";
import { z } from "zod";
import { getCircularPlan, stripePriceIdForPlan } from "@/lib/circular";
import { errorResponse } from "@/lib/http";
import {
  attachStripeSessionToSubscription,
  createCircularSubscription,
  getCustomerSession,
  listCircularSubscriptions,
  requireAdmin,
  shouldUseMockCircularSubscription,
  updateCircularSubscription,
} from "@/lib/platform";
import {
  createCircularSubscriptionCheckoutSession,
  stripeConfigured,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("orders.manage");
    const subscriptions = await listCircularSubscriptions();
    return NextResponse.json({
      subscriptions,
      stripeConfigured: stripeConfigured(),
      mockMode: shouldUseMockCircularSubscription(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = z
      .object({
        planId: z.enum(["care", "repair_plus", "recycle_loop"]),
        customerEmail: z.string().email(),
        customerName: z.string().trim().min(2).max(120),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid subscription signup." },
        { status: 400 },
      );
    }

    const plan = getCircularPlan(parsed.data.planId);
    if (!plan) {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }

    const session = await getCustomerSession();
    const mock = shouldUseMockCircularSubscription();
    const subscription = await createCircularSubscription({
      planId: parsed.data.planId,
      customerEmail: session?.customer.email ?? parsed.data.customerEmail,
      customerName: session?.customer.fullName || parsed.data.customerName,
      customerId: session?.customer.id,
      mock,
    });

    if (mock) {
      return NextResponse.json({
        subscription,
        mock: true,
        checkoutUrl: null,
        message: "Mock subscription activated (Stripe keys unset or CIRCULAR_SUBSCRIPTIONS_MOCK).",
      });
    }

    const origin = new URL(request.url).origin;
    const checkout = await createCircularSubscriptionCheckoutSession({
      subscriptionId: subscription.id,
      planName: plan.name,
      planDescription: plan.description,
      customerEmail: subscription.customerEmail,
      pricePkr: plan.pricePkr,
      billingInterval: plan.billingInterval,
      stripePriceId: stripePriceIdForPlan(plan),
      origin,
    });

    if (!checkout.ok) {
      await updateCircularSubscription(subscription.id, { status: "cancelled" });
      return NextResponse.json({ error: checkout.error }, { status: 502 });
    }

    await attachStripeSessionToSubscription(subscription.id, checkout.sessionId);
    return NextResponse.json({
      subscription: { ...subscription, stripeSessionId: checkout.sessionId, status: "pending" },
      mock: false,
      checkoutUrl: checkout.url,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin("orders.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = z
      .object({
        id: z.string().min(1),
        status: z.enum(["pending", "active", "paused", "cancelled", "past_due"]),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid subscription update." }, { status: 400 });
    }

    const subscription = await updateCircularSubscription(parsed.data.id, {
      status: parsed.data.status,
    });
    return NextResponse.json({ subscription });
  } catch (error) {
    return errorResponse(error);
  }
}
