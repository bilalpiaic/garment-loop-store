import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/http";
import {
  createTakeBackRequest,
  getCustomerSession,
  getTakeBackById,
  listTakeBacks,
  requireAdmin,
  updateTakeBackRequest,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  description: z.string().trim().min(2).max(200),
  condition: z.enum(["good", "fair", "worn", "damaged"]),
  quantity: z.number().int().min(1).max(20),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (id) {
      if (!email) {
        return NextResponse.json({ error: "Email is required to look up a take-back." }, { status: 400 });
      }
      const item = await getTakeBackById(id, email);
      if (!item) {
        return NextResponse.json({ error: "Take-back not found." }, { status: 404 });
      }
      return NextResponse.json({ takeBack: item });
    }

    await requireAdmin("orders.manage");
    const takeBacks = await listTakeBacks();
    return NextResponse.json({ takeBacks });
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
        items: z.array(itemSchema).min(1).max(10),
        preferredPickupDate: z.string().trim().max(40).optional(),
        address: z.string().trim().max(240).optional(),
        city: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid take-back request." },
        { status: 400 },
      );
    }

    const session = await getCustomerSession();
    const takeBack = await createTakeBackRequest({
      ...parsed.data,
      customerId: session?.customer.id,
      customerEmail: session?.customer.email ?? parsed.data.customerEmail,
      customerName: session?.customer.fullName || parsed.data.customerName,
    });

    return NextResponse.json({ takeBack });
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
        status: z
          .enum(["requested", "scheduled", "received", "credited", "rejected", "completed"])
          .optional(),
        creditEstimatePkr: z.number().int().min(0).max(500_000).optional(),
        adminNote: z.string().trim().max(500).optional(),
        preferredPickupDate: z.string().trim().max(40).optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid take-back update." }, { status: 400 });
    }

    const takeBack = await updateTakeBackRequest(parsed.data.id, {
      status: parsed.data.status,
      creditEstimatePkr: parsed.data.creditEstimatePkr,
      adminNote: parsed.data.adminNote,
      preferredPickupDate: parsed.data.preferredPickupDate,
    });
    return NextResponse.json({ takeBack });
  } catch (error) {
    return errorResponse(error);
  }
}
