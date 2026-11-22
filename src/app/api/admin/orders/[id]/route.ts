import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { orderPatchSchema } from "@/lib/admin-schemas";
import { getOrder, requireAdmin, updateOrder } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("orders.view");
    const { id } = await context.params;
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin("orders.manage");
    const { id } = await context.params;
    const parsed = orderPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const order = await updateOrder(id, parsed.data, session.user.id);
    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
