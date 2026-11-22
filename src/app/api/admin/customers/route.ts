import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { customerPatchSchema } from "@/lib/admin-schemas";
import { getCustomer, listCustomers, requireAdmin, updateCustomerProfile } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin("customers.view");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const detail = await getCustomer(id);
      if (!detail) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      return NextResponse.json(detail);
    }
    const customers = await listCustomers();
    return NextResponse.json({ customers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin("customers.manage");
    const parsed = customerPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const customer = await updateCustomerProfile(parsed.data);
    return NextResponse.json({ customer });
  } catch (error) {
    return errorResponse(error);
  }
}
