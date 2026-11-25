import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  buyEasyPostLabel,
  easypostConfigured,
  shippingLabelStubMessage,
} from "@/lib/easypost";
import { getOrder, requireAdmin, updateOrder } from "@/lib/platform";
import { isEasyPostMethodId } from "@/lib/shipping";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderNumber: z.string().trim().min(1),
});

/**
 * Buy an EasyPost outbound label for an order that used a live carrier rate.
 * Attaches tracking + courier on the order when purchase succeeds.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin("orders.manage");

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

    if (!easypostConfigured()) {
      return NextResponse.json(
        {
          error: shippingLabelStubMessage(),
          easypostConfigured: false,
          orderNumber: order.orderNumber,
        },
        { status: 503 },
      );
    }

    const methodId = order.shippingMethodId ?? "";
    if (!isEasyPostMethodId(methodId)) {
      return NextResponse.json(
        {
          error:
            "Order shipping is not an EasyPost rate. Customers must check out with a live carrier option first.",
          easypostConfigured: true,
          orderNumber: order.orderNumber,
          shippingMethodId: methodId || null,
        },
        { status: 400 },
      );
    }

    const label = await buyEasyPostLabel(methodId);
    const courier = [label.carrier, label.service].filter(Boolean).join(" · ");
    await updateOrder(
      order.orderNumber,
      {
        trackingNumber: label.trackingNumber ?? order.trackingNumber,
        courier: courier || order.courier,
        notes: [order.notes, `Label: ${label.labelUrl}`].filter(Boolean).join("\n").slice(0, 2000),
      },
      session.user.id,
    );

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      labelUrl: label.labelUrl,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl,
      carrier: label.carrier,
      service: label.service,
      message: "Carrier label purchased. Tracking saved on the order.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
