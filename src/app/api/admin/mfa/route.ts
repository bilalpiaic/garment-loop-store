import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  requireAdmin,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().trim().regex(/^\d{6}$/),
});

const disableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function GET() {
  try {
    const session = await requireAdmin();
    const status = await getMfaStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { action?: string };
    if (body.action === "begin") {
      const result = await beginMfaEnrollment(session.user.id);
      return NextResponse.json(result);
    }
    if (body.action === "confirm") {
      const parsed = confirmSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }
      const result = await confirmMfaEnrollment(
        session.user.id,
        parsed.data.challengeId,
        parsed.data.code,
      );
      return NextResponse.json(result);
    }
    if (body.action === "disable") {
      const parsed = disableSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
      }
      const result = await disableMfa(session.user.id, parsed.data.code);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown MFA action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
