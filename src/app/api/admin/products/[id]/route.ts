import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { productSchema } from "@/lib/admin-schemas";
import { deleteProduct, requireAdmin, saveProduct } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin("products.manage");
    const { id } = await context.params;
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const product = await saveProduct({ ...parsed.data, id }, session.user.id);
    return NextResponse.json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin("products.manage");
    const { id } = await context.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
