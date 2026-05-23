const DEFAULT_SITE_URL = "https://byggello.se";

/**
 * Kanonisk bas-URL för canonical, sitemap, Open Graph, e-post m.m.
 * Använder aldrig VERCEL_URL – preview-domäner ska inte bli canonical.
 * Prioritet: NEXT_PUBLIC_SITE_URL → https://byggello.se
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_SITE_URL;
}

function isAllowedAuthHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h.startsWith("localhost:") || h === "localhost") return true;
  if (h === "byggello.se" || h.endsWith(".byggello.se")) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

/**
 * Bas-URL för auth i den aktuella requesten (preview, dev, prod).
 * Används när magic link ska peka till samma deployment som anropet.
 */
export function getSiteUrlFromRequest(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0]?.trim() || request.headers.get("host");

  if (host && isAllowedAuthHost(host)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return getSiteUrl();
}
