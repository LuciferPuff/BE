const LOCAL_DEV_ORIGIN = "http://localhost:3000";

/**
 * Kanonisk bas-URL för länkar, sitemap, Open Graph och auth-redirects.
 * Prioritet: NEXT_PUBLIC_SITE_URL → VERCEL_URL (preview) → localhost.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return LOCAL_DEV_ORIGIN;
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
