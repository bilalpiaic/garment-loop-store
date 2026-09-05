import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { inventorySchema } from "@/lib/admin-schemas";
import { adjustInventory, listInventory, listMovements, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("inventory.manage");
    const [items, movements] = await Promise.all([listInventory(), listMovements(40)]);
    return NextResponse.json({ items, movements });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("inventory.manage");
    const parsed = inventorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const stock = await adjustInventory({ ...parsed.data, actorId: session.user.id });
    return NextResponse.json({ stock });
  } catch (error) {
    return errorResponse(error);
  }
}
