/**
 * Kanonisk bas-URL för länkar, sitemap och Open Graph.
 * Sätt NEXT_PUBLIC_SITE_URL i Vercel (t.ex. https://byggello.se).
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://byggello.se";
  return raw.replace(/\/$/, "");
}
