import { isEmailSyntax, normalizeEmail } from "@/lib/email";

export type LoginIdentifier =
  | { kind: "email"; email: string; destination: string }
  | { kind: "phone"; email: string; phone: string; destination: string };

export function smsCustomerEmail(e164: string) {
  return `${e164.replace(/\D/g, "")}@sms.garmentloop.store`;
}

export function parseLoginIdentifier(raw: string): { ok: true; value: LoginIdentifier } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter your email or mobile number." };
  }

  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed);
    if (!isEmailSyntax(email)) {
      return { ok: false, error: "Enter a valid email (name@example.com)." };
    }
    return { ok: true, value: { kind: "email", email, destination: email } };
  }

  const phone = normalizeMobileNumber(trimmed);
  if (!phone) {
    return { ok: false, error: "Enter a valid email or mobile number." };
  }
  return {
    ok: true,
    value: { kind: "phone", phone, email: smsCustomerEmail(phone), destination: phone },
  };
}

export function normalizeMobileNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("03")) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("92")) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  if (raw.trim().startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("0")) {
    return `+${digits}`;
  }
  return null;
}

export function maskDestination(channel: "email" | "sms", destination: string) {
  if (channel === "email") {
    const [local, domain] = destination.split("@");
    if (!local || !domain) return destination;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}•••@${domain}`;
  }
  if (destination.length < 8) return destination;
  return `${destination.slice(0, 3)}••••••${destination.slice(-4)}`;
}
