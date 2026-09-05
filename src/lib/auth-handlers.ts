import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, withAdmin } from "@/lib/http";
import { startLogin, verifyCustomerOtp, logout, loginAdmin } from "@/lib/platform";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z
    .string({ error: "Enter your password." })
    .min(1, "Enter your password."),
});

const otpSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  code: z.string().trim().min(4, "Enter the one-time code."),
});

const adminLoginSchema = loginSchema;

export async function handleLogin(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await startLogin(parsed.data.email, parsed.data.password);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleOtpRequest(request: Request) {
  return handleLogin(request);
}

export async function handleOtpVerify(request: Request) {
  try {
    const parsed = otpSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    await verifyCustomerOtp(parsed.data.email, parsed.data.code);
    return NextResponse.json({ ok: true, kind: "customer" });
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
    return NextResponse.json({ ok: true, kind: "admin" });
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
