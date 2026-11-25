import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { exportOrdersAnalyticsCsv, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // No dedicated analytics permission — use orders.manage.
    await requireAdmin("orders.manage");
    const csv = await exportOrdersAnalyticsCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="garmentloop-orders-analytics.csv"',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
