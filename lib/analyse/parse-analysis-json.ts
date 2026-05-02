export type AnalysisResult = {
  rodaFlaggor: Array<{ titel: string; beskrivning: string }>;
  underhallsvarningar: Array<{ titel: string; beskrivning: string }>;
  fragorTillMaklaren: string[];
};

function stripCodeFences(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```\s*$/im.exec(t);
  if (fence?.[1]) return fence[1].trim();
  return t;
}

export function parseAnalysisJson(raw: string): AnalysisResult {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Ogiltigt JSON-objekt");
  }
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.rodaFlaggor) || !Array.isArray(o.underhallsvarningar)) {
    throw new Error("Saknar rodaFlaggor eller underhallsvarningar");
  }
  if (!Array.isArray(o.fragorTillMaklaren)) {
    throw new Error("Saknar fragorTillMaklaren");
  }
  return {
    rodaFlaggor: o.rodaFlaggor as AnalysisResult["rodaFlaggor"],
    underhallsvarningar: o.underhallsvarningar as AnalysisResult["underhallsvarningar"],
    fragorTillMaklaren: o.fragorTillMaklaren as string[],
  };
}
