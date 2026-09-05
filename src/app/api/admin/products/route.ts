import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { productSchema } from "@/lib/admin-schemas";
import { getAdminCatalog, requireAdmin, saveProduct } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("products.manage");
    const catalog = await getAdminCatalog();
    return NextResponse.json({ products: catalog.products });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("products.manage");
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const product = await saveProduct(parsed.data, session.user.id);
    return NextResponse.json({ product });
  } catch (error) {
    return errorResponse(error);
  }
}
