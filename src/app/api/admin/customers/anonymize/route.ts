import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { anonymizeCustomer, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

const schema = z.object({
  customerId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("customers.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "customerId required." }, { status: 400 });
    }
    const result = await anonymizeCustomer(parsed.data.customerId, session.user.id);
    return NextResponse.json({ ok: true, already: result.already });
  } catch (error) {
    return errorResponse(error);
  }
}
