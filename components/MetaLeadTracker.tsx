"use client";

import { useEffect, useRef } from "react";

import { isMetaPixelReady } from "@/lib/consent";

type Props = {
  eventId: string | null;
};

/** Browser-sida av Lead-dedup: samma eventID som servern skickade via CAPI. */
export function MetaLeadTracker({ eventId }: Props) {
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (eventId == null || eventId === "") return;

    const tryFire = () => {
      if (firedRef.current === eventId) return true;
      if (!isMetaPixelReady()) return false;
      if (typeof window.fbq !== "function") return false;
      window.fbq("track", "Lead", {}, { eventID: eventId });
      firedRef.current = eventId;
      return true;
    };

    if (tryFire()) return;

    const onReady = () => {
      tryFire();
    };
    window.addEventListener("byggello-meta-ready", onReady);
    return () => window.removeEventListener("byggello-meta-ready", onReady);
  }, [eventId]);

  return null;
}
