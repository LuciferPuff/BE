"use client";

import { clearConsent } from "@/lib/consent";

/** Footer link – clears consent so the banner can be shown again. */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="home-footer-cookie-settings"
      onClick={() => clearConsent()}
    >
      Cookieinställningar
    </button>
  );
}
