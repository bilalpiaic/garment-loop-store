import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  deleteContentPage,
  listContentPages,
  requireAdmin,
  saveContentPage,
} from "@/lib/platform";
import { slugify } from "@/lib/slug";

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
    const session = await requireAdmin("products.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = z
      .object({
        slug: z.string().min(1).optional(),
        title: z.string().min(1),
        excerpt: z.string().min(1),
        body: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid page payload." }, { status: 400 });
    }
    const slug = (parsed.data.slug?.trim() || slugify(parsed.data.title)).toLowerCase();
    const page = await saveContentPage(
      {
        slug,
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        body: parsed.data.body,
        updatedAt: new Date().toISOString(),
      },
      session.user.id,
    );
    return NextResponse.json({ page });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin("products.manage");
    const slug = new URL(request.url).searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });
    await deleteContentPage(slug, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
