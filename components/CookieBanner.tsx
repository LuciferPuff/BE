"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  CONSENT_CHANGED_EVENT,
  denyConsent,
  getConsent,
  setConsent,
} from "@/lib/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(getConsent() == null);
    };
    sync();
    window.addEventListener(CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
    >
      <div className="cookie-banner-inner">
        <div className="cookie-banner-copy">
          <p id="cookie-banner-title" className="cookie-banner-title">
            Cookies
          </p>
          <p id="cookie-banner-desc" className="cookie-banner-text">
            Vi använder cookies för att mäta hur sajten används och hur våra
            annonser fungerar. Inget används utan ditt godkännande.{" "}
            <Link href="/integritetspolicy">Läs mer i integritetspolicyn</Link>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="cookie-banner-btn cookie-banner-btn--accept"
            onClick={() => {
              setConsent("granted");
              setVisible(false);
            }}
          >
            Godkänn
          </button>
          <button
            type="button"
            className="cookie-banner-btn cookie-banner-btn--deny"
            onClick={() => {
              denyConsent();
              setVisible(false);
            }}
          >
            Neka
          </button>
        </div>
      </div>
    </div>
  );
}
