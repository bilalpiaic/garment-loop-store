import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { discountSchema } from "@/lib/admin-schemas";
import { deleteDiscount, listDiscounts, requireAdmin, saveDiscount } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("discounts.manage");
    const discounts = await listDiscounts();
    return NextResponse.json({ discounts });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin("discounts.manage");
    const parsed = discountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const discount = await saveDiscount(parsed.data);
    return NextResponse.json({ discount });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin("discounts.manage");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await deleteDiscount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
