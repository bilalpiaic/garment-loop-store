import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import { listContentPages, requireAdmin, saveContentPage } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("products.manage");
    const pages = await listContentPages();
    return NextResponse.json({ pages });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin("products.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = z
      .object({
        slug: z.string().min(1),
        title: z.string().min(1),
        excerpt: z.string().min(1),
        body: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid page payload." }, { status: 400 });
    }
    const page = await saveContentPage({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ page });
  } catch (error) {
    return errorResponse(error);
  }
}
