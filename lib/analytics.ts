import { sendGAEvent } from "@next/third-parties/google";

import { getConsent } from "@/lib/consent";

/** Fire a GA4 event by name only – never attach PII or content params. */
export function track(eventName: string): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  if (typeof window.gtag !== "function") return;

  try {
    sendGAEvent("event", eventName);
  } catch {
    /* gtag missing or third-parties not mounted – silent */
  }
}
