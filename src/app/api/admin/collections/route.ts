import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { collectionSchema } from "@/lib/admin-schemas";
import { deleteCollection, getAdminCatalog, requireAdmin, saveCollection } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("collections.manage");
    const catalog = await getAdminCatalog();
    return NextResponse.json({ collections: catalog.collections });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin("collections.manage");
    const parsed = collectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const collection = await saveCollection(parsed.data);
    return NextResponse.json({ collection });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin("collections.manage");
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
    await deleteCollection(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
