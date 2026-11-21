import { NextResponse } from "next/server";
import { z } from "zod";
import { markOrderPaid } from "@/lib/platform";
import { verifyStripeCheckoutSession } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(1),
  orderNumber: z.string().min(1),
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
    return NextResponse.json({ error: "Missing session or order." }, { status: 400 });
  }

  const verified = await verifyStripeCheckoutSession(parsed.data.sessionId);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 502 });
  }
  if (!verified.paid) {
    return NextResponse.json({ error: "Payment not completed yet." }, { status: 402 });
  }
  if (verified.orderNumber && verified.orderNumber !== parsed.data.orderNumber) {
    return NextResponse.json({ error: "Session does not match this order." }, { status: 400 });
  }

  try {
    const order = await markOrderPaid(parsed.data.orderNumber, verified.sessionId);
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update order." },
      { status: 404 },
    );
  }
}
