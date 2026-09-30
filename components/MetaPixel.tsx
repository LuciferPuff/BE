"use client";

import Script from "next/script";

function getPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return raw;
}

/**
 * Stub köar fbq-anrop direkt (ingen nätverksfil).
 * fbevents.js laddas lazy så LCP/TBT på mobil inte blockeras.
 */
export function MetaPixel() {
  const pixelId = getPixelId();
  if (pixelId == null) return null;

  return (
    <>
      <Script id="meta-pixel-stub" strategy="beforeInteractive">
        {`
!function(f,n){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];}(window);
        `}
      </Script>
      <Script id="meta-pixel" strategy="lazyOnload">
        {`
(function(){
  var s=document.createElement('script');
  s.async=true;
  s.src='https://connect.facebook.net/en_US/fbevents.js';
  s.onload=function(){
    if(typeof fbq==='function'){
      fbq('init','${pixelId}');
      fbq('track','PageView');
    }
  };
  document.head.appendChild(s);
})();
        `}
      </Script>
      <noscript>
        {/* Meta Pixel noscript-fallback – next/image stöds inte här */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
