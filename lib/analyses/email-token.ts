import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_SEC = 60 * 60 * 24; // 24h

function secret(): string | null {
  return process.env.ANALYSIS_EMAIL_TOKEN_SECRET?.trim() || null;
}

function signPayload(payload: string): string {
  const key = secret();
  if (!key) throw new Error("Saknar ANALYSIS_EMAIL_TOKEN_SECRET");
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Kortlivad token för /api/analyse/email (HMAC över user_analysis_id + exp). */
export function createAnalysisEmailToken(
  userAnalysisId: string,
  ttlSec = DEFAULT_TTL_SEC,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${userAnalysisId}.${exp}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyAnalysisEmailToken(
  token: string,
): { userAnalysisId: string } | null {
  if (!secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userAnalysisId, expStr, sig] = parts;
  if (!userAnalysisId || !expStr || !sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  const payload = `${userAnalysisId}.${expStr}`;
  let expected: string;
  try {
    expected = signPayload(payload);
  } catch {
    return null;
  }
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userAnalysisId };
}
