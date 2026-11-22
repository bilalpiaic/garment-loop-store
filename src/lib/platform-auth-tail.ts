import { cookies } from "next/headers";
import { cache } from "react";
import { createId, createToken } from "@/lib/ids";
import { sha256, verifyPassword } from "@/lib/password";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
} from "@/lib/identity";
import { can, type Permission } from "@/lib/roles";
import { PlatformError, mutate, readPlatform } from "@/lib/platform-internals";

const CUSTOMER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

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

export const getCustomerSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (!token) return undefined;
  return readPlatform((state) => {
    const session = state.sessions.find(
      (item) => item.id === token && item.kind === "customer" && new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) return undefined;
    const customer = state.customers.find((item) => item.id === session.userId);
    if (!customer) return undefined;
    const addresses = state.addresses.filter((item) => item.customerId === customer.id);
    return { customer, addresses, session };
  });
});

export const getAdminSession = cache(async () => {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return undefined;
  return readPlatform((state) => {
    const session = state.sessions.find(
      (item) => item.id === token && item.kind === "admin" && new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) return undefined;
    const user = state.adminUsers.find((item) => item.id === session.userId && item.active);
    if (!user) return undefined;
    return { user, session };
  });
});

export async function requireAdmin(permission?: Permission) {
  const session = await getAdminSession();
  if (!session) throw new PlatformError("Sign in required.", 401);
  if (permission && !can(session.user.role, permission)) {
    throw new PlatformError("You do not have access to this action.", 403);
  }
  return session;
}
