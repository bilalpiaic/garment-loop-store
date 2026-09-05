import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await context.params;
  const order = await getOrder(orderNumber);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ order });
}
