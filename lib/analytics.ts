import { getConsent } from "@/lib/consent";

/**
 * Fire a GA4 event by name only – never attach PII or content params.
 * Uses window.gtag directly (basic/strict: no-op without consent / without GA).
 */
export function track(eventName: string): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  if (!eventName || eventName.length > 40) return;

  const fire = (): boolean => {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName);
      return true;
    }
    return false;
  };

  if (fire()) return;

  // ConsentAnalytics mounts GA after hydration – retry briefly if gtag not ready yet.
  let attempts = 0;
  const id = window.setInterval(() => {
    attempts += 1;
    if (fire() || attempts >= 20) {
      window.clearInterval(id);
    }
  }, 250);
}
