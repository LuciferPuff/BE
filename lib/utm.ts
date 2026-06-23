export type UtmParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export function firstParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseUtmFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): UtmParams {
  return {
    utm_source: firstParam(params.utm_source),
    utm_medium: firstParam(params.utm_medium),
    utm_campaign: firstParam(params.utm_campaign),
  };
}

/** Bygger /analys-länk med UTM-parametrar bevarade från landningssidan. */
export function buildAnalysHref(
  params: Record<string, string | string[] | undefined>,
): string {
  const q = new URLSearchParams();
  const utm = parseUtmFromSearchParams(params);
  if (utm.utm_source != null) q.set("utm_source", utm.utm_source);
  if (utm.utm_medium != null) q.set("utm_medium", utm.utm_medium);
  if (utm.utm_campaign != null) q.set("utm_campaign", utm.utm_campaign);
  const qs = q.toString();
  return qs === "" ? "/analys" : `/analys?${qs}`;
}
