import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { markOrderPaid } from "@/lib/platform";
import { verifyStripeCheckoutSession, verifyStripePaymentIntent } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    orderNumber: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    paymentIntentId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.sessionId || value.paymentIntentId), {
    message: "Missing session or payment intent.",
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing session, payment intent, or order." }, { status: 400 });
  }

  try {
    if (parsed.data.paymentIntentId) {
      const verified = await verifyStripePaymentIntent(parsed.data.paymentIntentId);
      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 502 });
      }
      if (verified.orderNumber && verified.orderNumber !== parsed.data.orderNumber) {
        return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 });
      }
      if (verified.processing) {
        const order = await getOrder(parsed.data.orderNumber);
        return NextResponse.json(
          {
            processing: true,
            status: verified.status,
            order,
            message: "Payment is processing. We will mark the order paid when Stripe confirms.",
          },
          { status: 202 },
        );
      }
      if (!verified.paid) {
        return NextResponse.json(
          { error: `Payment not completed yet (${verified.status}).` },
          { status: 402 },
        );
      }
      const order = await markOrderPaid(parsed.data.orderNumber, verified.paymentIntentId);
      return NextResponse.json({ order });
    }

    const verified = await verifyStripeCheckoutSession(parsed.data.sessionId!);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 502 });
    }
    if (!verified.paid) {
      return NextResponse.json({ error: "Payment not completed yet." }, { status: 402 });
    }
    if (verified.orderNumber && verified.orderNumber !== parsed.data.orderNumber) {
      return NextResponse.json({ error: "Session does not match this order." }, { status: 400 });
    }

    const order = await markOrderPaid(parsed.data.orderNumber, verified.sessionId);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update order." },
      { status: 404 },
    );
  }
}
