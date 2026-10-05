"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import {
  CONSENT_CHANGED_EVENT,
  getConsent,
  type ConsentValue,
} from "@/lib/consent";

function getPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return raw;
}

/**
 * Meta Pixel – only after granted consent.
 * No noscript &lt;img&gt; pixel (cannot be gated by consent).
 */
export function MetaPixel() {
  const pixelId = getPixelId();
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

  if (pixelId == null || consent !== "granted") return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
(function(){
  if (window.__byggelloMetaReady) return;
  !function(f,n){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];}(window);
  var s=document.createElement('script');
  s.async=true;
  s.src='https://connect.facebook.net/en_US/fbevents.js';
  s.onload=function(){
    if(typeof fbq==='function'){
      fbq('consent','grant');
      fbq('init','${pixelId}');
      fbq('track','PageView');
      window.__byggelloMetaReady=true;
      try{sessionStorage.setItem('byggello_tracking_loaded','1');}catch(e){}
      window.dispatchEvent(new CustomEvent('byggello-meta-ready'));
    }
  };
  document.head.appendChild(s);
})();
      `}
    </Script>
  );
}
