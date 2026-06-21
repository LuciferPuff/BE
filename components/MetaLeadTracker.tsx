"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type Props = {
  eventId: string | null;
};

/** Browser-sida av Lead-dedup: samma eventID som servern skickade via CAPI. */
export function MetaLeadTracker({ eventId }: Props) {
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (eventId == null || eventId === "") return;
    if (firedRef.current === eventId) return;
    firedRef.current = eventId;

    if (typeof window.fbq === "function") {
      window.fbq("track", "Lead", {}, { eventID: eventId });
    }
  }, [eventId]);

  return null;
}
