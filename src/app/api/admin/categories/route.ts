import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { categorySchema } from "@/lib/admin-schemas";
import { deleteCategory, getAdminCatalog, requireAdmin, saveCategory } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("categories.manage");
    const catalog = await getAdminCatalog();
    return NextResponse.json({ categories: catalog.categories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin("categories.manage");
    const parsed = categorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const category = await saveCategory(parsed.data);
    return NextResponse.json({ category });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin("categories.manage");
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
    await deleteCategory(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
