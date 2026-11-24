import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  deleteReview,
  getCustomerSession,
  listApprovedReviews,
  listReviewsForAdmin,
  moderateReview,
  replyToReview,
  requireAdmin,
  submitReview,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  productId: z.string().min(1),
  productSlug: z.string().min(1),
  authorName: z.string().trim().min(2),
  authorEmail: z.string().trim().email(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(1200),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId") ?? undefined;
    const admin = url.searchParams.get("admin") === "1";
    if (admin) {
      await requireAdmin("products.manage");
      const reviews = await listReviewsForAdmin();
      return NextResponse.json({ reviews });
    }
    const reviews = await listApprovedReviews(productId);
    return NextResponse.json({ reviews });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid review." },
        { status: 400 },
      );
    }
    const session = await getCustomerSession();
    const review = await submitReview({
      ...parsed.data,
      customerId: session?.customer.id,
    });
    return NextResponse.json({ review, message: "Thanks — your review is awaiting moderation." });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
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
        id: z.string().min(1),
        status: z.enum(["approved", "rejected"]).optional(),
        adminReply: z.string().trim().min(2).max(1200).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation payload." }, { status: 400 });
    }
    if (parsed.data.adminReply) {
      const review = await replyToReview(parsed.data.id, parsed.data.adminReply, session.user.id);
      return NextResponse.json({ review });
    }
    if (!parsed.data.status) {
      return NextResponse.json({ error: "Provide status or adminReply." }, { status: 400 });
    }
    const review = await moderateReview(parsed.data.id, parsed.data.status, session.user.id);
    return NextResponse.json({ review });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin("products.manage");
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing review id." }, { status: 400 });
    await deleteReview(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
