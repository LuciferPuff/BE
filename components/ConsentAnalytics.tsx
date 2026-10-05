"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";

import {
  CONSENT_CHANGED_EVENT,
  getConsent,
  markTrackingLoadedInSession,
  type ConsentValue,
} from "@/lib/consent";

function getGaId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/** Loads GA4 only after granted consent (basic/strict – no script before). */
export function ConsentAnalytics() {
  const gaId = getGaId();
  const [consent, setConsentState] = useState<ConsentValue | null>(null);

  useEffect(() => {
    setConsentState(getConsent());
    const onChange = () => setConsentState(getConsent());
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    if (consent === "granted" && gaId) {
      markTrackingLoadedInSession();
    }
  }, [consent, gaId]);

  if (consent !== "granted" || !gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
