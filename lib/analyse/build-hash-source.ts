/**
 * Normaliserad sträng för SHA-256 när fastighetsbeteckning saknas.
 * Måste vara identisk på klient och server om hash ska verifieras där senare.
 *
 * BYG-56: adresser kommer numera ofta från Google Places (formatted_address)
 * och kan se ut som "Storgatan 1, 111 22 Stockholm, Sverige". Vi normaliserar
 * bort komma och kollapsar whitespace så cache-träffar fungerar oavsett om
 * användaren skrev manuellt eller valde från dropdown. Befintliga cachade
 * analyser i Supabase invalideras gradvis när hash ändras, vilket är OK.
 */

const normalizeAddress = (s: string): string =>
  s.toLowerCase().trim().replace(/\s+/g, " ").replace(/,/g, "").trim();

export function buildInputHashSource(
  address: string,
  yearBuilt: number,
  objectType: string,
): string {
  return `${normalizeAddress(address)}|${yearBuilt}|${objectType.trim().toLowerCase()}`;
}
