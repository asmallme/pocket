import { createHash, randomBytes } from "node:crypto";

export function createMobileShareToken() {
  return randomBytes(32).toString("base64url");
}

export function hashMobileShareToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
