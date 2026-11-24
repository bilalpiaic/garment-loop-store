import { NextResponse } from "next/server";
import { authorizeOrderAccess, publicOrderView } from "@/lib/order-access";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? request.headers.get("x-order-token");
  const email = url.searchParams.get("email");

  const access = await authorizeOrderAccess(orderNumber, { token, email });
  if (!access.ok) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order: publicOrderView(access.order) });
}
