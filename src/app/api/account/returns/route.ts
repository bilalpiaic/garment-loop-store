import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { RETURN_REASON_CODES } from "@/lib/commerce-types";
import {
  createReturnRequest,
  getCustomerSession,
  getOrder,
  listReturnsForCustomer,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const reasonCodes = RETURN_REASON_CODES.map((item) => item.code) as [
  (typeof RETURN_REASON_CODES)[number]["code"],
  ...(typeof RETURN_REASON_CODES)[number]["code"][],
];

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const returns = await listReturnsForCustomer(session.customer.id, session.customer.email);
    return NextResponse.json({ returns });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = z
      .object({
        orderNumber: z.string().min(1),
        reasonCode: z.enum(reasonCodes),
        reason: z.string().trim().min(3).max(500),
        type: z.enum(["return", "exchange"]).optional(),
        items: z
          .array(
            z.object({
              variantId: z.string().min(1),
              quantity: z.number().int().min(1),
            }),
          )
          .min(1, "Select at least one item."),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid return request." },
        { status: 400 },
      );
    }

    const order = await getOrder(parsed.data.orderNumber);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const owns =
      order.customerId === session.customer.id ||
      order.customer.email.toLowerCase() === session.customer.email.toLowerCase();
    if (!owns) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const ret = await createReturnRequest({
      orderNumber: order.orderNumber,
      reason: parsed.data.reason,
      reasonCode: parsed.data.reasonCode,
      type: parsed.data.type ?? (parsed.data.reasonCode === "exchange" ? "exchange" : "return"),
      items: parsed.data.items,
      customerId: session.customer.id,
      requireDelivered: true,
      source: "customer",
    });

    return NextResponse.json({ return: ret });
  } catch (error) {
    return errorResponse(error);
  }
}
