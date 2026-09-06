import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, withAdmin } from "@/lib/http";
import { startLogin, verifyCustomerOtp, logout, loginAdmin } from "@/lib/platform";
import { isEmailSyntax } from "@/lib/email";

const identifierField = z
  .string({ error: "Enter your email or mobile number." })
  .trim()
  .min(3, "Enter your email or mobile number.")
  .max(120);

const loginSchema = z
  .object({
    identifier: identifierField.optional(),
    email: identifierField.optional(),
    password: z
      .string({ error: "Enter your password." })
      .min(8, "Password must be at least 8 characters.")
      .max(200),
  })
  .refine((data) => Boolean(data.identifier || data.email), {
    message: "Enter your email or mobile number.",
    path: ["identifier"],
  });

const otpSchema = z
  .object({
    identifier: identifierField.optional(),
    email: identifierField.optional(),
    code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  })
  .refine((data) => Boolean(data.identifier || data.email), {
    message: "Enter your email or mobile number.",
    path: ["identifier"],
  });

const adminLoginSchema = z.object({
  email: z
    .string({ error: "Enter your email." })
    .trim()
    .toLowerCase()
    .refine(isEmailSyntax, "Enter a valid email (name@example.com)."),
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
});

function loginIdentifier(data: { identifier?: string; email?: string }) {
  return data.identifier || data.email || "";
}

export async function handleLogin(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await startLogin(loginIdentifier(parsed.data), parsed.data.password);
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
    await verifyCustomerOtp(loginIdentifier(parsed.data), parsed.data.code);
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
