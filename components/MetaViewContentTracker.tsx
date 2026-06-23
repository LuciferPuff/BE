"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const FBQ_POLL_MS = 100;
const FBQ_POLL_MAX_MS = 10_000;

/** Meta Pixel ViewContent – en gång per sidvisning (t.ex. Meta-landningssida). */
export function MetaViewContentTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const fire = (): boolean => {
      if (firedRef.current) return true;
      // fbq-stubben skapas av MetaPixel och köar anrop innan fbevents.js laddat.
      // Vänta tills den finns – avbryt inte tyst om useEffect kör före afterInteractive.
      if (window.fbq) {
        window.fbq("track", "ViewContent");
        firedRef.current = true;
        return true;
      }
      return false;
    };

    if (fire()) return;

    const started = Date.now();
    const intervalId = window.setInterval(() => {
      if (fire() || Date.now() - started >= FBQ_POLL_MAX_MS) {
        window.clearInterval(intervalId);
      }
    }, FBQ_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
