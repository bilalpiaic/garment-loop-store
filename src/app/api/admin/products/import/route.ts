import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { importProductCsv, previewProductCsv, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  csv: z.string().min(1, "Paste or upload a CSV."),
  commit: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("products.manage");
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    if (parsed.data.commit) {
      const result = await importProductCsv(parsed.data.csv, session.user.id);
      return NextResponse.json({ ok: true, ...result });
    }
    const preview = await previewProductCsv(parsed.data.csv);
    return NextResponse.json(preview);
  } catch (error) {
    return errorResponse(error);
  }
}
