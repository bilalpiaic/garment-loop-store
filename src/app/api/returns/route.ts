import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  createReturnRequest,
  listReturns,
  requireAdmin,
  updateReturnRequest,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("orders.manage");
    const returns = await listReturns();
    return NextResponse.json({ returns });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin("orders.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = z
      .object({
        orderNumber: z.string().min(1),
        reason: z.string().trim().min(3),
        reasonCode: z
          .enum([
            "size_fit",
            "damaged",
            "wrong_item",
            "changed_mind",
            "quality",
            "exchange",
            "other",
          ])
          .optional(),
        type: z.enum(["return", "exchange"]).optional(),
        items: z
          .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1) }))
          .optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid return request." }, { status: 400 });
    }
    const ret = await createReturnRequest({ ...parsed.data, source: "admin" });
    return NextResponse.json({ return: ret });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin("orders.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = z
      .object({
        id: z.string().min(1),
        action: z.enum(["approve", "reject", "restock", "refund"]),
        adminNote: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid return action." }, { status: 400 });
    }
    const ret = await updateReturnRequest(parsed.data.id, parsed.data.action, parsed.data.adminNote);
    return NextResponse.json({ return: ret });
  } catch (error) {
    return errorResponse(error);
  }
}
