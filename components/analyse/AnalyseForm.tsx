"use client";

import { useId, useState } from "react";

import { Disclaimer } from "@/components/analys/Disclaimer";
import { FeedbackBox } from "@/components/analys/FeedbackBox";
import type {
  AnalysisFinding,
  AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";

const PROPERTY_TYPES = ["Villa", "Kedjehus", "Radhus", "Fritidshus"] as const;

function AnalysisFindingBody({ item }: { item: AnalysisFinding }) {
  const hasThreePart =
    item.vadDetAr !== "" ||
    item.varforDetSpelarRoll !== "" ||
    item.vadDuGor !== "";

  if (!hasThreePart) {
    return null;
  }

  return (
    <div className="analyse-result-parts">
      {item.vadDetAr !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Vad det är</span>
          <p className="analyse-result-part-text">{item.vadDetAr}</p>
        </div>
      )}
      {item.varforDetSpelarRoll !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Varför det spelar roll</span>
          <p className="analyse-result-part-text">{item.varforDetSpelarRoll}</p>
        </div>
      )}
      {item.vadDuGor !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Vad du gör</span>
          <p className="analyse-result-part-text">{item.vadDuGor}</p>
        </div>
      )}
    </div>
  );
}

type ApiOk = {
  ok: true;
  cached?: boolean;
  analysisId?: string;
  analysis: AnalysisResult;
};

type ApiErr = { ok: false; message?: string };

export function AnalyseForm() {
  const id = useId();
  const [address, setAddress] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [objectType, setObjectType] = useState<string>(
    PROPERTY_TYPES[0] ?? "Villa",
  );
  const [buildYear, setBuildYear] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [adText, setAdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setAnalysis(null);
    setAnalysisId(null);
    setFromCache(false);

    const year = Number.parseInt(buildYear, 10);
    const sqm = Number.parseFloat(sizeSqm);
    const price = Number.parseFloat(askingPrice);

    if (address.trim() === "") {
      setErrorMessage("Ange adress.");
      return;
    }
    if (
      !PROPERTY_TYPES.includes(objectType as (typeof PROPERTY_TYPES)[number])
    ) {
      setErrorMessage("Välj objekttyp.");
      return;
    }
    if (!Number.isFinite(year) || year < 1600 || year > 2100) {
      setErrorMessage("Ange ett giltigt byggnadsår.");
      return;
    }
    if (!Number.isFinite(sqm) || sqm <= 0) {
      setErrorMessage("Ange storlek i kvm.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage("Ange begärt pris.");
      return;
    }
    if (adText.trim() === "") {
      setErrorMessage("Klistra in annonstexten från Hemnet.");
      return;
    }

    const pid = propertyId.trim();
    const payload: Record<string, unknown> = {
      address: address.trim(),
      objectType,
      buildYear: year,
      sizeSqm: sqm,
      askingPrice: Math.round(price),
      adText: adText.trim(),
    };
    if (pid !== "") {
      payload.propertyId = pid;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiOk | ApiErr;

      if (!res.ok || data.ok !== true) {
        const err = data as ApiErr;
        setErrorMessage(
          typeof err.message === "string" && err.message !== ""
            ? err.message
            : "Något gick fel. Försök igen.",
        );
        return;
      }

      setAnalysis(data.analysis);
      setAnalysisId(
        typeof data.analysisId === "string" && data.analysisId !== ""
          ? data.analysisId
          : null,
      );
      setFromCache(data.cached === true);
    } catch {
      setErrorMessage("Kunde inte ansluta. Försök igen senare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="analyse-form" onSubmit={onSubmit} noValidate>
        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-address`}>
            Adress <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${id}-address`}
            name="address"
            type="text"
            required
            autoComplete="street-address"
            className="analyse-form-input"
            value={address}
            onChange={(ev) => setAddress(ev.target.value)}
            disabled={loading}
          />
        </div>

        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-bet`}>
            Fastighetsbeteckning{" "}
            <span className="analyse-form-optional">(frivilligt)</span>
          </label>
          <input
            id={`${id}-bet`}
            name="propertyId"
            type="text"
            className="analyse-form-input"
            value={propertyId}
            onChange={(ev) => setPropertyId(ev.target.value)}
            disabled={loading}
            aria-describedby={`${id}-bet-help`}
          />
          <p id={`${id}-bet-help`} className="analyse-form-help">
            Finns ofta i Hemnet-annonsen, t.ex. Björkbacken 1:23
          </p>
        </div>

        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-type`}>
            Objekttyp <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${id}-type`}
            name="objectType"
            required
            className="analyse-form-select"
            value={objectType}
            onChange={(ev) => setObjectType(ev.target.value)}
            disabled={loading}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="analyse-form-row">
          <div className="analyse-form-field">
            <label className="analyse-form-label" htmlFor={`${id}-year`}>
              Byggnadsår <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${id}-year`}
              name="buildYear"
              type="number"
              inputMode="numeric"
              min={1600}
              max={2100}
              required
              className="analyse-form-input"
              value={buildYear}
              onChange={(ev) => setBuildYear(ev.target.value)}
              disabled={loading}
            />
          </div>
          <div className="analyse-form-field">
            <label className="analyse-form-label" htmlFor={`${id}-sqm`}>
              Storlek i kvm <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${id}-sqm`}
              name="sizeSqm"
              type="number"
              inputMode="decimal"
              min={1}
              step={1}
              required
              className="analyse-form-input"
              value={sizeSqm}
              onChange={(ev) => setSizeSqm(ev.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-price`}>
            Begärt pris i kr <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${id}-price`}
            name="askingPrice"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            required
            className="analyse-form-input"
            value={askingPrice}
            onChange={(ev) => setAskingPrice(ev.target.value)}
            disabled={loading}
          />
        </div>

        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-listing`}>
            Annonstext från Hemnet <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${id}-listing`}
            name="adText"
            required
            rows={14}
            className="analyse-form-textarea"
            placeholder="Klistra in så mycket information som möjligt från Hemnet-annonsen – beskrivning, fakta, byggnadsinformation, tomtuppgifter, driftskostnader och allt annat som finns. Ju mer information, desto bättre analys."
            value={adText}
            onChange={(ev) => setAdText(ev.target.value)}
            disabled={loading}
          />
        </div>

        <div className="analyse-form-actions">
          <button
            type="submit"
            className="analyse-form-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="analyse-form-submit-inner">
                <span className="analyse-form-spinner" aria-hidden="true" />
                Skickar…
              </span>
            ) : (
              "Analysera"
            )}
          </button>
        </div>

        {errorMessage != null && (
          <p
            className="analyse-form-feedback analyse-form-feedback--error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </form>

      {analysis != null && (
        <div className="analyse-result" role="region" aria-label="Analysresultat">
          <p className="analyse-result-meta">
            {fromCache
              ? "Resultat från cache (samma bostad analyserades tidigare)."
              : "Ny analys klar."}
          </p>
          <p className="analyse-result-suggest-hint">
            Något som saknades eller var fel?{" "}
            <a href="#analyse-suggest" className="analyse-result-suggest-link">
              Hoppa till kommentarsfältet
            </a>
            .
          </p>

          <section className="analyse-result-block">
            <h2 className="analyse-result-heading">Röda flaggor</h2>
            <ul className="analyse-result-list">
              {analysis.rodaFlaggor.map((item, i) => (
                <li key={`r-${i}`} className="analyse-result-item">
                  <strong className="analyse-result-item-title">
                    {item.titel}
                  </strong>
                  <AnalysisFindingBody item={item} />
                </li>
              ))}
            </ul>
          </section>

          <section className="analyse-result-block">
            <h2 className="analyse-result-heading">Underhåll och åtgärder</h2>
            <ul className="analyse-result-list">
              {analysis.underhallsvarningar.map((item, i) => (
                <li key={`u-${i}`} className="analyse-result-item">
                  <strong className="analyse-result-item-title">
                    {item.titel}
                  </strong>
                  <AnalysisFindingBody item={item} />
                </li>
              ))}
            </ul>
          </section>

          <section className="analyse-result-block">
            <h2 className="analyse-result-heading">Frågor till mäklaren</h2>
            <ol className="analyse-result-ol">
              {analysis.fragorTillMaklaren.map((q, i) => (
                <li key={`q-${i}`}>{q}</li>
              ))}
            </ol>
          </section>

          <Disclaimer />
          <section
            id="analyse-suggest"
            className="analyse-suggest-section"
            aria-labelledby="analyse-suggest-title"
          >
            <h2
              id="analyse-suggest-title"
              className="analyse-result-heading"
            >
              Förbättra analysen
            </h2>
            <p className="analyse-suggest-lede">
              Din kommentar hjälper oss att justera modellen och täppa till
              luckor i framtida analyser.
            </p>
            <FeedbackBox analysisId={analysisId} />
          </section>
        </div>
      )}
    </>
  );
}
