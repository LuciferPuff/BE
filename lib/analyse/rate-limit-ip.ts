/** Enkel in-memory rate limit per IP och kalenderdag (UTC). Bäst-effort i serverless. */
const DAILY_LIMIT = 5;
const store = new Map<string, { count: number; day: string }>();

export function consumeAnalyseRateSlot(ip: string): boolean {
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
