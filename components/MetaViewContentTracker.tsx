"use client";

import { useEffect, useRef } from "react";

import {
  CONSENT_CHANGED_EVENT,
  getConsent,
  isMetaPixelReady,
} from "@/lib/consent";

const POLL_MS = 200;
const POLL_MAX_MS = 15_000;

/** Meta Pixel ViewContent – en gång per sidvisning, endast efter granted + init. */
export function MetaViewContentTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const tryFire = (): boolean => {
      if (firedRef.current) return true;
      if (getConsent() !== "granted") return false;
      if (!isMetaPixelReady()) return false;
      if (typeof window.fbq !== "function") return false;
      window.fbq("track", "ViewContent");
      firedRef.current = true;
      return true;
    };

    if (tryFire()) return;

    const onReady = () => {
      tryFire();
    };
    const onConsent = () => {
      tryFire();
    };

    window.addEventListener("byggello-meta-ready", onReady);
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent);

    const started = Date.now();
    const intervalId = window.setInterval(() => {
      if (tryFire() || Date.now() - started >= POLL_MAX_MS) {
        window.clearInterval(intervalId);
      }
    }, POLL_MS);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("byggello-meta-ready", onReady);
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent);
    };
  }, []);

  return null;
}
