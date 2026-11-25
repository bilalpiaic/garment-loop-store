import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  getCustomerSession,
  listApprovedQuestions,
  listQuestionsForAdmin,
  moderateQuestion,
  requireAdmin,
  submitQuestion,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  productId: z.string().min(1),
  productSlug: z.string().min(1),
  authorName: z.string().trim().min(2),
  authorEmail: z.string().trim().email(),
  body: z.string().trim().min(10).max(800),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId") ?? undefined;
    const admin = url.searchParams.get("admin") === "1";
    if (admin) {
      await requireAdmin("products.manage");
      const questions = await listQuestionsForAdmin();
      return NextResponse.json({ questions });
    }
    const questions = await listApprovedQuestions(productId);
    return NextResponse.json({ questions });
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
        { error: parsed.error.issues[0]?.message ?? "Invalid question." },
        { status: 400 },
      );
    }
    const session = await getCustomerSession();
    const question = await submitQuestion({
      ...parsed.data,
      customerId: session?.customer.id,
    });
    return NextResponse.json({
      question,
      message: "Thanks — your question is awaiting moderation.",
    });
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
        answer: z.string().trim().min(2).max(1200).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid moderation payload." }, { status: 400 });
    }
    if (!parsed.data.status && !parsed.data.answer) {
      return NextResponse.json({ error: "Provide status or answer." }, { status: 400 });
    }
    const question = await moderateQuestion(
      parsed.data.id,
      { status: parsed.data.status, answer: parsed.data.answer },
      session.user.id,
    );
    return NextResponse.json({ question });
  } catch (error) {
    return errorResponse(error);
  }
}
