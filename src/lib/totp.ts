import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20) {
  return toBase32(randomBytes(bytes));
}

export function buildOtpAuthUri(params: {
  secret: string;
  email: string;
  issuer?: string;
}) {
  const issuer = params.issuer ?? "GarmentLoop Admin";
  const label = encodeURIComponent(`${issuer}:${params.email}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function verifyTotpCode(secret: string, codeRaw: string, window = 1) {
  const code = codeRaw.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotp(secret, counter + offset);
    const left = Buffer.from(expected);
    const right = Buffer.from(code);
    if (left.length === right.length && timingSafeEqual(left, right)) {
      return true;
    }
  }
  return false;
}

export function generateTotp(secret: string, counter: number) {
  const key = fromBase32(secret);
  const buffer = Buffer.alloc(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buffer[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  const hmac = createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function toBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function fromBase32(input: string) {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** When true, owner/admin must enroll and use TOTP. Staff remain optional. */
export function adminMfaRequiredByPolicy() {
  return process.env.ADMIN_MFA_REQUIRED === "1" || process.env.ADMIN_MFA_REQUIRED === "true";
}
