import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { collectionAssignSchema } from "@/lib/admin-schemas";
import { requireAdmin, setCollectionProducts } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requireAdmin("collections.manage");
    const parsed = collectionAssignSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await setCollectionProducts(parsed.data.slug, parsed.data.productIds);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
