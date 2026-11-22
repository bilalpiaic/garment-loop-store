import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { easypostConfigured, shippingLabelStubMessage } from "@/lib/easypost";
import { getOrder, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderNumber: z.string().trim().min(1),
});

/**
 * Stub endpoint for carrier label purchase / prepaid RMA labels.
 * Tracking fields remain on the order form; buying labels is intentionally not live yet.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin("orders.manage");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Order number required." }, { status: 400 });
    }

    const order = await getOrder(parsed.data.orderNumber);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        stub: true,
        easypostConfigured: easypostConfigured(),
        orderNumber: order.orderNumber,
        message: shippingLabelStubMessage(),
        next: "Prepaid RMA / outbound label purchase will attach PDF + tracking here in a later release.",
      },
      { status: 501 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
