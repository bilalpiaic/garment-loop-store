import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { tillActionSchema } from "@/lib/admin-schemas";
import {
  addTillMovement,
  closeTillSession,
  collectTillOrder,
  deleteExpense,
  getTillControl,
  openTillSession,
  recordTillSale,
  requireAdmin,
  saveExpense,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin("till.manage");
    const days = Number(new URL(request.url).searchParams.get("days") ?? "30");
    const snapshot = await getTillControl(Number.isFinite(days) ? days : 30);
    return NextResponse.json({ snapshot });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("till.manage");
    const parsed = tillActionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const body = parsed.data;
    const actor = { actorId: session.user.id, actorName: session.user.name };
    if (body.action === "open") {
      const till = await openTillSession({ ...actor, openingFloatPkr: body.openingFloatPkr, note: body.note });
      return NextResponse.json({ ok: true, till });
    }
    if (body.action === "close") {
      const till = await closeTillSession({ ...actor, countedCashPkr: body.countedCashPkr, note: body.note });
      return NextResponse.json({ ok: true, till });
    }
    if (body.action === "movement") {
      const movement = await addTillMovement({
        type: body.type,
        amountPkr: body.amountPkr,
        note: body.note,
        actorId: session.user.id,
      });
      return NextResponse.json({ ok: true, movement });
    }
    if (body.action === "expense") {
      const expense = await saveExpense({
        category: body.category,
        amountPkr: body.amountPkr,
        note: body.note,
        incurredAt: body.incurredAt,
        fromTill: body.fromTill,
        actorId: session.user.id,
      });
      return NextResponse.json({ ok: true, expense });
    }
    if (body.action === "sale") {
      const order = await recordTillSale({
        variantId: body.variantId,
        quantity: body.quantity,
        fullName: body.fullName,
        note: body.note,
        actorId: session.user.id,
      });
      return NextResponse.json({ ok: true, order });
    }
    if (body.action === "collect") {
      const order = await collectTillOrder(body.orderNumber, session.user.id);
      return NextResponse.json({ ok: true, order });
    }
    await deleteExpense(body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
