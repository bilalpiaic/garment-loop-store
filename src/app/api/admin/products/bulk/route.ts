import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { productBulkSchema } from "@/lib/admin-schemas";
import { bulkSetProductStatus, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("products.manage");
    const parsed = productBulkSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await bulkSetProductStatus(parsed.data.ids, parsed.data.status, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
