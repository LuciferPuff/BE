/**
 * Indata-rikhet för analys-cache.
 *
 * Cachen nycklas på adress/år/typ (eller property_id) – inte på hur mycket
 * annonstext som klistrats in. Därför jämför vi rikhet vid cache-träff:
 * tydligt rikare indata → kör om Claude och skriv över cachen.
 */

export type InputRichnessParts = {
  adText: string;
  sizeSqm: number;
  askingPrice: number;
};

/** Max antal tecken som räknas – undvik att extremt långa pastes “låser” toppen. */
const AD_TEXT_CAP = 20_000;

/** Minsta absoluta poängökning för att räkna som uppgradering. */
const MIN_ABSOLUTE_GAIN = 300;

/** Minsta relativa förbättring (25 %). */
const MIN_RELATIVE_FACTOR = 1.25;

/**
 * Poäng baserad främst på annonstextens längd.
 * Numeriska fält ger små bonusar (redan obligatoriska i API:t).
 */
export function computeInputRichness(input: InputRichnessParts): number {
  const textLen = Math.min(input.adText.trim().length, AD_TEXT_CAP);
  let score = textLen;
  if (Number.isFinite(input.sizeSqm) && input.sizeSqm > 0) score += 50;
  if (Number.isFinite(input.askingPrice) && input.askingPrice > 0) score += 50;
  return score;
}

/**
 * True när ny request är tillräckligt rikare än cachad analys
 * för att motivera en omkörning (kostnad vs kvalitet).
 */
export function isSignificantlyRicher(
  incoming: number,
  cached: number,
): boolean {
  if (!(incoming > cached)) return false;
  const absoluteGain = incoming - cached;
  return (
    absoluteGain >= MIN_ABSOLUTE_GAIN && incoming >= cached * MIN_RELATIVE_FACTOR
  );
}
