import {createHmac, timingSafeEqual} from "node:crypto";

export const AUTH_COOKIE = "asta_session";

function secret() {
  return process.env.AUTH_SECRET || process.env.ASTA_APP_PASSWORD || "development-only-secret";
}

export function authEnabled() {
  return Boolean(process.env.ASTA_APP_PASSWORD);
}

export function sessionToken() {
  return createHmac("sha256", secret()).update("asta-owner-session").digest("hex");
}

export function verifyPassword(password: string) {
  const expected = process.env.ASTA_APP_PASSWORD;
  if (!expected) return true;
  const left = Buffer.from(password);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifySession(value?: string) {
  if (!authEnabled()) return true;
  if (!value) return false;
  const left = Buffer.from(value);
  const right = Buffer.from(sessionToken());
  return left.length === right.length && timingSafeEqual(left, right);
}
