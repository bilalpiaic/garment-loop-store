import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listOrders, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("orders.view");
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}
