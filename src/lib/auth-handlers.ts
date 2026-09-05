import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, withAdmin } from "@/lib/http";
import { requestCustomerOtp, verifyCustomerOtp, logout, loginAdmin } from "@/lib/platform";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

const otpSchema = emailSchema.extend({
  code: z.string().trim().min(4, "Enter the code from your email."),
});

const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Enter your password."),
});

export async function handleOtpRequest(request: Request) {
  try {
    const parsed = emailSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await requestCustomerOtp(parsed.data.email);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleOtpVerify(request: Request) {
  try {
    const parsed = otpSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await verifyCustomerOtp(parsed.data.email, parsed.data.code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCustomerLogout() {
  try {
    await logout("customer");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAdminLogin(request: Request) {
  try {
    const parsed = adminLoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await loginAdmin(parsed.data.email, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleAdminLogout() {
  try {
    await logout("admin");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export { withAdmin };
