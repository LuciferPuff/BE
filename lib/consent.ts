/** Consent + tracking helpers (client-only). Basic/strict: no scripts before granted. */

export const CONSENT_STORAGE_KEY = "byggello_consent";
export const CONSENT_CHANGED_EVENT = "byggello-consent-changed";
const TRACKING_LOADED_KEY = "byggello_tracking_loaded";

export type ConsentValue = "granted" | "denied";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    /* private mode */
  }
  return null;
}

export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { consent: value } }),
  );
}

/** Clears choice so the banner shows again (Cookieinställningar). */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { consent: null } }),
  );
}

export function markTrackingLoadedInSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TRACKING_LOADED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasTrackingLoadedInSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(TRACKING_LOADED_KEY) === "1";
  } catch {
    return false;
  }
}

function clearTrackingLoadedFlag(): void {
  try {
    window.sessionStorage.removeItem(TRACKING_LOADED_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.__byggelloMetaReady = false;
  }
}

function cookieDomains(): string[] {
  const host = window.location.hostname;
  const domains = ["", host];
  if (host !== "localhost" && !host.endsWith(".localhost")) {
    const parts = host.split(".");
    if (parts.length >= 2) {
      domains.push(`.${parts.slice(-2).join(".")}`);
    }
    domains.push(`.${host}`);
  }
  return [...new Set(domains)];
}

function deleteCookie(name: string): void {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const domain of cookieDomains()) {
    const domainPart = domain ? `; domain=${domain}` : "";
    document.cookie = `${name}=; expires=${expires}; path=/${domainPart}`;
  }
}

/** First-party tracking cookies on byggello.se only. */
export function clearTrackingCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter(Boolean);

  for (const name of names) {
    if (
      name === "_ga" ||
      name.startsWith("_ga_") ||
      name === "_fbp" ||
      name === "_fbc" ||
      name === "_gid" ||
      name === "_gcl_au"
    ) {
      deleteCookie(name);
    }
  }
}

/**
 * Remove only known GA/Meta client keys – never Supabase sb-* or app auth.
 */
export function clearTrackingStorageKeys(): void {
  if (typeof window === "undefined") return;
  const stores: Storage[] = [];
  try {
    stores.push(window.localStorage, window.sessionStorage);
  } catch {
    return;
  }

  const isTrackingKey = (key: string) => {
    if (key.startsWith("sb-")) return false;
    if (key === CONSENT_STORAGE_KEY) return false;
    if (key === TRACKING_LOADED_KEY) return true;
    if (key.startsWith("_ga") || key.startsWith("_gid")) return true;
    if (key.includes("google-analytics") || key.includes("gtag")) return true;
    if (key.startsWith("_fbp") || key.startsWith("_fbc")) return true;
    if (key.toLowerCase().includes("facebook") && key.includes("pixel")) {
      return true;
    }
    return false;
  };

  for (const store of stores) {
    const toRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && isTrackingKey(key)) toRemove.push(key);
    }
    for (const key of toRemove) {
      try {
        store.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}

function revokeRuntimeConsent(): void {
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  }
  if (typeof window.fbq === "function") {
    window.fbq("consent", "revoke");
  }
}

/**
 * Only path for Neka / revoke.
 * If GA or Meta already ran this session → revoke APIs, clear cookies, reload.
 * Otherwise → clear cookies, no reload.
 */
export function denyConsent(): void {
  if (typeof window === "undefined") return;

  const hadTracking = hasTrackingLoadedInSession();

  if (hadTracking) {
    revokeRuntimeConsent();
  }

  setConsent("denied");
  clearTrackingStorageKeys();
  clearTrackingCookies();
  clearTrackingLoadedFlag();

  if (hadTracking) {
    window.location.reload();
  }
}

export function isMetaPixelReady(): boolean {
  if (typeof window === "undefined") return false;
  return window.__byggelloMetaReady === true && getConsent() === "granted";
}

export function markMetaPixelReady(): void {
  if (typeof window === "undefined") return;
  window.__byggelloMetaReady = true;
  markTrackingLoadedInSession();
}
