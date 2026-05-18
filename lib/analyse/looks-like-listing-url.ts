export const ERR_ADTEXT_LINK =
  "Det ser ut som en länk. Vi kan inte hämta text från Hemnet eller andra sidor – öppna annonsen, kopiera all text och klistra in den här.";

/** True om fältet mest ser ut som en annons-URL, inte klistrad annonstext. */
export function looksLikeListingUrl(text: string): boolean {
  const t = text.trim();
  if (t === "") return false;

  const singleLine = !t.includes("\n");

  if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;

  if (singleLine && t.length < 150 && /https?:\/\/|www\.\S+/i.test(t)) {
    return true;
  }

  const listingHost =
    /hemnet\.se|booli\.se|qasa\.se|boneo\.|realtor\.com|\.se\/\S*annons/i;
  if (listingHost.test(t) && /https?:\/\//i.test(t) && t.length < 250) {
    return true;
  }

  const withoutUrls = t.replace(/https?:\/\/\S+/gi, "").trim();
  if (/https?:\/\//i.test(t) && withoutUrls.length < 80) {
    return true;
  }

  return false;
}
