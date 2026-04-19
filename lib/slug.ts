/**
 * Normaliserar slug från Next.js [slug]-segment så den matchar slug.current i Sanity.
 * Hanterar percent-encoding (t.ex. %C3%B6 för ö) och Unicode NFC.
 */
export function normalizeArticleSlugParam(raw: string): string {
  let s = (raw ?? "").trim();
  if (s === "") return "";

  let prev = "";
  for (let i = 0; i < 5 && s !== prev; i++) {
    prev = s;
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }

  return s.normalize("NFC");
}
