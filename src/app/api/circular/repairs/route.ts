import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  createRepairRequest,
  getCustomerSession,
  getRepairById,
  listRepairs,
  requireAdmin,
  updateRepairRequest,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
      if (!email) {
        return NextResponse.json({ error: "Email is required to look up a repair." }, { status: 400 });
      }
      const item = await getRepairById(id, email);
      if (!item) {
        return NextResponse.json({ error: "Repair request not found." }, { status: 404 });
      }
      return NextResponse.json({ repair: item });
    }

    await requireAdmin("orders.manage");
    const repairs = await listRepairs();
    return NextResponse.json({ repairs });
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

    const parsed = z
      .object({
        customerEmail: z.string().email(),
        customerName: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(40).optional(),
        garmentDescription: z.string().trim().min(3).max(240),
        issue: z.string().trim().min(3).max(500),
        preferredDate: z.string().trim().max(40).optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid repair request." },
        { status: 400 },
      );
    }

    const session = await getCustomerSession();
    const repair = await createRepairRequest({
      ...parsed.data,
      customerId: session?.customer.id,
      customerEmail: session?.customer.email ?? parsed.data.customerEmail,
      customerName: session?.customer.fullName || parsed.data.customerName,
    });

    return NextResponse.json({ repair });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin("orders.manage");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = z
      .object({
        id: z.string().min(1),
        status: z
          .enum([
            "requested",
            "quoted",
            "scheduled",
            "in_progress",
            "ready",
            "completed",
            "cancelled",
          ])
          .optional(),
        quotePkr: z.number().int().min(0).max(500_000).optional(),
        appointmentAt: z.string().trim().max(80).optional(),
        adminNote: z.string().trim().max(500).optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid repair update." }, { status: 400 });
    }

    const repair = await updateRepairRequest(
      parsed.data.id,
      {
        status: parsed.data.status,
        quotePkr: parsed.data.quotePkr,
        appointmentAt: parsed.data.appointmentAt,
        adminNote: parsed.data.adminNote,
      },
      session.user.id,
    );
    return NextResponse.json({ repair });
  } catch (error) {
    return errorResponse(error);
  }
}
