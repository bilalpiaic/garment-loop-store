import {
  ADMIN_SESSION_MS,
  CUSTOMER_SESSION_MS,
  OTP_TTL_MS,
  PlatformError,
  mutate,
  readPlatform,
} from "@/lib/platform-core";
import { cookies } from "next/headers";
import { sha256, verifyPassword } from "@/lib/password";
import { createId, createOtpCode, createToken } from "@/lib/ids";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  type CustomerAddress,
  type Discount,
} from "@/lib/identity";

export async function listCustomers() {
  return readPlatform((state) => {
    return state.customers.map((customer) => {
      const orders = state.orders.filter(
        (order) => order.customerId === customer.id || order.customer.email.toLowerCase() === customer.email,
      );
      return {
        ...customer,
        ordersCount: orders.length,
        lastOrderAt: orders[0]?.createdAt,
        totalSpendPkr: orders.reduce((sum, order) => sum + order.totalPkr, 0),
      };
    });
  });
}

export async function getCustomer(id: string) {
  return readPlatform((state) => {
    const customer = state.customers.find((item) => item.id === id);
    if (!customer) return undefined;
    const orders = state.orders.filter(
      (order) => order.customerId === customer.id || order.customer.email.toLowerCase() === customer.email,
    );
    const addresses = state.addresses.filter((address) => address.customerId === customer.id);
    return { customer, orders, addresses };
  });
}

export async function getCustomerByEmail(email: string) {
  return readPlatform((state) =>
    state.customers.find((item) => item.email === email.trim().toLowerCase()),
  );
}

export async function saveAddress(address: Omit<CustomerAddress, "id"> & { id?: string }) {
  return mutate((state) => {
    const next: CustomerAddress = {
      ...address,
      id: address.id ?? createId("adr"),
    };
    if (next.isDefault) {
      for (const item of state.addresses) {
        if (item.customerId === next.customerId) item.isDefault = false;
      }
    }
    const index = state.addresses.findIndex((item) => item.id === next.id);
    if (index >= 0) state.addresses[index] = next;
    else state.addresses.unshift(next);
    return next;
  });
}

export async function listDiscounts() {
  return readPlatform((state) => state.discounts);
}

export async function saveDiscount(input: Omit<Discount, "id" | "usedCount"> & { id?: string; usedCount?: number }) {
  return mutate((state) => {
    const code = input.code.trim().toUpperCase();
    const existing = state.discounts.find(
      (item) => item.code.toUpperCase() === code && item.id !== input.id,
    );
    if (existing) throw new PlatformError("That code already exists.");
    const discount: Discount = {
      id: input.id ?? createId("dsc"),
      code,
      description: input.description,
      type: input.type,
      value: input.value,
      minOrderPkr: input.minOrderPkr,
      usageLimit: input.usageLimit,
      usedCount: input.usedCount ?? 0,
      expiresAt: input.expiresAt,
      active: input.active,
    };
    const index = state.discounts.findIndex((item) => item.id === discount.id);
    if (index >= 0) state.discounts[index] = { ...discount, usedCount: state.discounts[index]!.usedCount };
    else state.discounts.unshift(discount);
    return discount;
  });
}

export async function deleteDiscount(id: string) {
  return mutate((state) => {
    state.discounts = state.discounts.filter((item) => item.id !== id);
  });
}

export async function requestCustomerOtp(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PlatformError("Enter a valid email.");
  }
  const code = createOtpCode();
  await mutate((state) => {
    const recent = state.otp.filter(
      (item) => item.email === email && Date.now() - new Date(item.createdAt).getTime() < 60 * 60 * 1000,
    );
    if (recent.length >= 5) {
      throw new PlatformError("Too many login attempts. Try again in an hour.", 429);
    }
    state.otp = state.otp.filter((item) => item.email !== email);
    state.otp.push({
      email,
      codeHash: sha256(`${email}:${code}`),
      expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    });
  });
  console.info(`[auth] OTP for ${email}: ${code}`);
  const show = process.env.AUTH_SHOW_OTP === "1" || process.env.NODE_ENV !== "production";
  return { ok: true as const, devCode: show ? code : undefined };
}

export async function verifyCustomerOtp(emailRaw: string, code: string) {
  const email = emailRaw.trim().toLowerCase();
  const sessionId = await mutate((state) => {
    const challenge = state.otp.find((item) => item.email === email);
    if (!challenge) throw new PlatformError("Request a new code first.");
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      throw new PlatformError("That code has expired.");
    }
    challenge.attempts += 1;
    if (challenge.attempts > 5) {
      throw new PlatformError("Too many attempts. Request a new code.");
    }
    if (challenge.codeHash !== sha256(`${email}:${code.trim()}`)) {
      throw new PlatformError("That code is incorrect.");
    }
    state.otp = state.otp.filter((item) => item.email !== email);
    let customer = state.customers.find((item) => item.email === email);
    if (!customer) {
      customer = {
        id: createId("cus"),
        email,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      state.customers.unshift(customer);
    } else {
      customer.lastLoginAt = new Date().toISOString();
    }
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "customer",
      userId: customer.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CUSTOMER_SESSION_MS).toISOString(),
    });
    return sessionId;
  });
  await setSessionCookie(CUSTOMER_COOKIE, sessionId, CUSTOMER_SESSION_MS);
  return { ok: true as const };
}

export async function loginAdmin(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const sessionId = await mutate(async (state) => {
    const user = state.adminUsers.find((item) => item.email === email);
    if (!user || !user.active) throw new PlatformError("Invalid email or password.", 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new PlatformError("Invalid email or password.", 401);
    user.lastLoginAt = new Date().toISOString();
    const sessionId = createToken();
    state.sessions.push({
      id: sessionId,
      kind: "admin",
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_MS).toISOString(),
    });
    return sessionId;
  });
  await setSessionCookie(ADMIN_COOKIE, sessionId, ADMIN_SESSION_MS);
  return { ok: true as const };
}

export async function logout(kind: "customer" | "admin") {
  const name = kind === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  const jar = await cookies();
  const token = jar.get(name)?.value;
  if (token) {
    await mutate((state) => {
      state.sessions = state.sessions.filter((session) => session.id !== token);
    });
  }
  jar.delete(name);
}

async function setSessionCookie(name: string, value: string, maxAgeMs: number) {
  const jar = await cookies();
  jar.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}
