/**
 * Enkel in-memory rate limit per IP och kalenderdag (UTC) för analys-mejl.
 * Separat från `rate-limit-ip.ts` så analys- och mejl-räknare inte kopplas ihop.
 * Best-effort i serverless (nollställs vid cold start) – tillräckligt för v1
 * mot uppenbart missbruk av Resend-kvoten.
 */
const DAILY_LIMIT = 5;
const store = new Map<string, { count: number; day: string }>();

export function consumeEmailAnalysisSlot(ip: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const rec = store.get(ip);
  if (!rec || rec.day !== day) {
    store.set(ip, { count: 1, day });
    return true;
  }
  if (rec.count >= DAILY_LIMIT) return false;
  rec.count += 1;
  return true;
}
