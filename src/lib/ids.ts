import { randomBytes, randomInt } from "node:crypto";

export function createId(prefix?: string) {
  const id = randomBytes(12).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}

export function createToken() {
  return randomBytes(32).toString("hex");
}

export function createOtpCode() {
  return String(randomInt(100000, 1000000));
}
