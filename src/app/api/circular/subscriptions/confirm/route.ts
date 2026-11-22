import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { activateCircularSubscription, getCircularSubscription } from "@/lib/platform";
import { verifyCircularSubscriptionCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(1),
  subscriptionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing session or subscription." }, { status: 400 });
    }

    const existing = await getCircularSubscription(parsed.data.subscriptionId);
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }
    if (existing.status === "active") {
      return NextResponse.json({ subscription: existing });
    }

    const verified = await verifyCircularSubscriptionCheckoutSession(parsed.data.sessionId);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 502 });
    }
    if (!verified.complete) {
      return NextResponse.json({ error: "Checkout not completed yet." }, { status: 402 });
    }
    if (verified.subscriptionId && verified.subscriptionId !== parsed.data.subscriptionId) {
      return NextResponse.json({ error: "Session does not match this subscription." }, { status: 400 });
    }

    const subscription = await activateCircularSubscription(parsed.data.subscriptionId, {
      stripeSessionId: verified.sessionId,
      stripeSubscriptionId: verified.stripeSubscriptionId,
      stripeCustomerId: verified.stripeCustomerId,
    });
    return NextResponse.json({ subscription });
  } catch (error) {
    return errorResponse(error);
  }
}
