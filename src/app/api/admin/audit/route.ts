import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { listAuditLogs, requireAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin("audit.view");
    const { searchParams } = new URL(request.url);
    const logs = await listAuditLogs({
      action: searchParams.get("action") ?? undefined,
      actorEmail: searchParams.get("actor") ?? undefined,
      entity: searchParams.get("entity") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 150,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return errorResponse(error);
  }
}
