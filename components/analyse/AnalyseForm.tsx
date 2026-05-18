"use client";

import { useId, useState } from "react";

import { AddressAutocomplete } from "@/components/analyse/AddressAutocomplete";
import { AnalysisResultView } from "@/components/analyse/AnalysisResultView";
import type { AnalysisResult } from "@/lib/analyse/parse-analysis-json";

const PROPERTY_TYPES = ["Villa", "Kedjehus", "Radhus", "Fritidshus"] as const;

const ERR_ADDRESS_MIN = "Adress saknas.";
const ERR_BUILD_YEAR_RANGE = "Ange ett rimligt byggnadsår.";
const ERR_ADTEXT_MIN =
  "Klistra in mer information från annonsen – minst 100 tecken krävs för en träffsäker analys.";

type ApiOk = {
  ok: true;
  cached?: boolean;
  analysisId?: string;
  analysis: AnalysisResult;
};

type ApiErr = { ok?: false; message?: string; error?: string };

function apiErrText(data: unknown): string {
  if (data != null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.error === "string" && o.error !== "") return o.error;
    if (typeof o.message === "string" && o.message !== "") return o.message;
  }
  return "";
}

export function AnalyseForm() {
  const id = useId();
  const [address, setAddress] = useState("");
  // city kommer från Google Places (postal_town/locality). Sparas i state nu;
  // skickas till API och visas som eget fält i BYG-44 när det är byggt.
  const [, setCity] = useState("");
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
  const [fieldErrors, setFieldErrors] = useState<{
    address?: string;
    buildYear?: string;
    adText?: string;
  }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setAnalysis(null);
    setAnalysisId(null);
    setFromCache(false);

    const addressTrim = address.trim();
    const adTrim = adText.trim();
    const year = Number.parseInt(buildYear, 10);
    const sqm = Number.parseFloat(sizeSqm);
    const price = Number.parseFloat(askingPrice);

    const nextFieldErr: {
      address?: string;
      buildYear?: string;
      adText?: string;
    } = {};

    if (!addressTrim || addressTrim.length < 5) {
      nextFieldErr.address = ERR_ADDRESS_MIN;
    }
    if (!Number.isFinite(year) || year < 1800 || year > 2026) {
      nextFieldErr.buildYear = ERR_BUILD_YEAR_RANGE;
    }
    if (!adTrim || adTrim.length < 100) {
      nextFieldErr.adText = ERR_ADTEXT_MIN;
    }

    if (
      !PROPERTY_TYPES.includes(objectType as (typeof PROPERTY_TYPES)[number])
    ) {
      setErrorMessage("Välj objekttyp.");
      if (Object.keys(nextFieldErr).length > 0) {
        setFieldErrors(nextFieldErr);
      }
      return;
    }
    if (!Number.isFinite(sqm) || sqm <= 0) {
      setErrorMessage("Ange storlek i kvm.");
      if (Object.keys(nextFieldErr).length > 0) {
        setFieldErrors(nextFieldErr);
      }
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setErrorMessage("Ange begärt pris.");
      if (Object.keys(nextFieldErr).length > 0) {
        setFieldErrors(nextFieldErr);
      }
      return;
    }

    if (Object.keys(nextFieldErr).length > 0) {
      setFieldErrors(nextFieldErr);
      return;
    }

    const pid = propertyId.trim();
    const payload: Record<string, unknown> = {
      address: addressTrim,
      objectType,
      buildYear: year,
      sizeSqm: sqm,
      askingPrice: Math.round(price),
      adText: adTrim,
    };
    if (pid !== "") {
      payload.propertyId = pid;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiOk | ApiErr;

      if (!res.ok || data.ok !== true) {
        const text = apiErrText(data);
        if (text === ERR_ADDRESS_MIN) {
          setFieldErrors({ address: text });
        } else if (text === ERR_BUILD_YEAR_RANGE) {
          setFieldErrors({ buildYear: text });
        } else if (text === ERR_ADTEXT_MIN) {
          setFieldErrors({ adText: text });
        } else {
          setErrorMessage(
            text !== "" ? text : "Något gick fel. Försök igen.",
          );
        }
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
          <AddressAutocomplete
            id={`${id}-address`}
            value={address}
            onChange={({ address: a, city: c }) => {
              setAddress(a);
              setCity(c);
              setFieldErrors((f) => ({ ...f, address: undefined }));
            }}
            error={fieldErrors.address}
            errorId={`${id}-address-err`}
            disabled={loading}
          />
          {fieldErrors.address != null && (
            <p
              id={`${id}-address-err`}
              className="analyse-form-feedback analyse-form-feedback--error"
              role="alert"
            >
              {fieldErrors.address}
            </p>
          )}
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
            Finns ofta i bostadsannonsen på mäklarens sida t.ex Björkbacken 1:23
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
              min={1800}
              max={2026}
              required
              className="analyse-form-input"
              value={buildYear}
              onChange={(ev) => {
                setBuildYear(ev.target.value);
                setFieldErrors((f) => ({ ...f, buildYear: undefined }));
              }}
              disabled={loading}
              aria-invalid={fieldErrors.buildYear != null}
              aria-describedby={
                fieldErrors.buildYear != null ? `${id}-year-err` : undefined
              }
            />
            {fieldErrors.buildYear != null && (
              <p
                id={`${id}-year-err`}
                className="analyse-form-feedback analyse-form-feedback--error"
                role="alert"
              >
                {fieldErrors.buildYear}
              </p>
            )}
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
            Annonstext från bostadsannonsen <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${id}-listing`}
            name="adText"
            required
            rows={14}
            className="analyse-form-textarea"
            placeholder="Klistra in så mycket information som möjligt från bostadsannonsen – beskrivning, fakta, byggnadsinformation, tomtuppgifter, driftkostnader och allt annat som finns. Ju mer information, desto bättre analys. OBS! Det fungerar inte med en annonslänk, då vi inte kan eller får läsa information direkt från andra hemsidor."
            value={adText}
            onChange={(ev) => {
              setAdText(ev.target.value);
              setFieldErrors((f) => ({ ...f, adText: undefined }));
            }}
            disabled={loading}
            aria-invalid={fieldErrors.adText != null}
            aria-describedby={
              fieldErrors.adText != null ? `${id}-listing-err` : undefined
            }
          />
          {fieldErrors.adText != null && (
            <p
              id={`${id}-listing-err`}
              className="analyse-form-feedback analyse-form-feedback--error"
              role="alert"
            >
              {fieldErrors.adText}
            </p>
          )}
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

      {analysis != null && analysisId != null && (
        <AnalysisResultView
          analysis={analysis}
          analysisId={analysisId}
          metaLabel={
            fromCache
              ? "Resultat från cache (samma bostad analyserades tidigare)."
              : "Ny analys klar."
          }
        />
      )}
    </>
  );
}
