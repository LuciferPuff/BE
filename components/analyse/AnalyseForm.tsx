"use client";

import { useId, useState } from "react";

import { buildInputHashSource } from "@/lib/analyse/build-hash-source";

const PROPERTY_TYPES = ["Villa", "Kedjehus", "Radhus", "Fritidshus"] as const;

async function sha256Hex(message: string): Promise<string> {
  const buf = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AnalyseForm() {
  const id = useId();
  const [address, setAddress] = useState("");
  const [fastighetsbeteckning, setFastighetsbeteckning] = useState("");
  const [propertyType, setPropertyType] = useState<string>(
    PROPERTY_TYPES[0] ?? "Villa",
  );
  const [yearBuilt, setYearBuilt] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [askingPriceSek, setAskingPriceSek] = useState("");
  const [listingText, setListingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultMessage(null);
    setErrorMessage(null);

    const year = Number.parseInt(yearBuilt, 10);
    const sqm = Number.parseFloat(sizeSqm);
    const price = Number.parseFloat(askingPriceSek);

    if (address.trim() === "") {
      setErrorMessage("Ange adress.");
      return;
    }
    if (!PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])) {
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
    if (listingText.trim() === "") {
      setErrorMessage("Klistra in annonstexten från Hemnet.");
      return;
    }

    const bet = fastighetsbeteckning.trim();
    const fastighetsbeteckningOut = bet !== "" ? bet : null;
    let inputHash: string | null = null;
    if (fastighetsbeteckningOut == null) {
      const source = buildInputHashSource(address, year, propertyType);
      inputHash = await sha256Hex(source);
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fastighetsbeteckning: fastighetsbeteckningOut,
          input_hash: inputHash,
          address: address.trim(),
          property_type: propertyType,
          year_built: year,
          size_sqm: sqm,
          asking_price_sek: Math.round(price),
          listing_text: listingText.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (res.ok && data.ok === true) {
        setResultMessage(
          typeof data.message === "string" && data.message !== ""
            ? data.message
            : "Tack! Din förfrågan har tagits emot.",
        );
        return;
      }
      setErrorMessage(
        typeof data.message === "string" && data.message !== ""
          ? data.message
          : "Något gick fel. Försök igen.",
      );
    } catch {
      setErrorMessage("Kunde inte ansluta. Försök igen senare.");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          name="fastighetsbeteckning"
          type="text"
          className="analyse-form-input"
          value={fastighetsbeteckning}
          onChange={(ev) => setFastighetsbeteckning(ev.target.value)}
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
          name="property_type"
          required
          className="analyse-form-select"
          value={propertyType}
          onChange={(ev) => setPropertyType(ev.target.value)}
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
            name="year_built"
            type="number"
            inputMode="numeric"
            min={1600}
            max={2100}
            required
            className="analyse-form-input"
            value={yearBuilt}
            onChange={(ev) => setYearBuilt(ev.target.value)}
            disabled={loading}
          />
        </div>
        <div className="analyse-form-field">
          <label className="analyse-form-label" htmlFor={`${id}-sqm`}>
            Storlek i kvm <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${id}-sqm`}
            name="size_sqm"
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
          name="asking_price_sek"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          className="analyse-form-input"
          value={askingPriceSek}
          onChange={(ev) => setAskingPriceSek(ev.target.value)}
          disabled={loading}
        />
      </div>

      <div className="analyse-form-field">
        <label className="analyse-form-label" htmlFor={`${id}-listing`}>
          Annonstext från Hemnet <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${id}-listing`}
          name="listing_text"
          required
          rows={14}
          className="analyse-form-textarea"
          placeholder="Klistra in beskrivningen från Hemnet-annonsen här..."
          value={listingText}
          onChange={(ev) => setListingText(ev.target.value)}
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
        <p className="analyse-form-feedback analyse-form-feedback--error" role="alert">
          {errorMessage}
        </p>
      )}
      {resultMessage != null && (
        <p className="analyse-form-feedback analyse-form-feedback--success" role="status">
          {resultMessage}
        </p>
      )}
    </form>
  );
}
