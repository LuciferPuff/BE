export type AnalysisFinding = {
  titel: string;
  vadDetAr: string;
  varforDetSpelarRoll: string;
  vadDuGor: string;
};

export type AnalysisResult = {
  rodaFlaggor: AnalysisFinding[];
  underhallsvarningar: AnalysisFinding[];
  fragorTillMaklaren: string[];
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeFinding(raw: unknown): AnalysisFinding {
  if (!raw || typeof raw !== "object") {
    throw new Error("Ogiltigt objekt i rodaFlaggor eller underhallsvarningar");
  }
  const r = raw as Record<string, unknown>;
  const titel = str(r.titel);
  const vadDetAr = str(r.vadDetAr);
  const varforDetSpelarRoll = str(r.varforDetSpelarRoll);
  const vadDuGor = str(r.vadDuGor);
  const beskrivning = str(r.beskrivning);

  if (vadDetAr !== "" || varforDetSpelarRoll !== "" || vadDuGor !== "") {
    return {
      titel,
      vadDetAr: vadDetAr !== "" ? vadDetAr : beskrivning,
      varforDetSpelarRoll,
      vadDuGor,
    };
  }

  return {
    titel,
    vadDetAr: beskrivning,
    varforDetSpelarRoll: "",
    vadDuGor: "",
  };
}

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
    rodaFlaggor: o.rodaFlaggor.map(normalizeFinding),
    underhallsvarningar: o.underhallsvarningar.map(normalizeFinding),
    fragorTillMaklaren: o.fragorTillMaklaren.filter(
      (q): q is string => typeof q === "string" && q.trim() !== "",
    ),
  };
}
