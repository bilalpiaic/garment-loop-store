import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { orderBulkSchema } from "@/lib/admin-schemas";
import { bulkUpdateOrders, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin("orders.manage");
    const parsed = orderBulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await bulkUpdateOrders(parsed.data.orderNumbers, parsed.data.status);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
