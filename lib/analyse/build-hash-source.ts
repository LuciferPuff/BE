/**
 * Normaliserad sträng för SHA-256 när fastighetsbeteckning saknas.
 * Måste vara identisk på klient och server om hash ska verifieras där senare.
 */
export function buildInputHashSource(
  address: string,
  yearBuilt: number,
  propertyType: string,
): string {
  return `${address.trim().toLowerCase()}|${yearBuilt}|${propertyType.trim()}`;
}
