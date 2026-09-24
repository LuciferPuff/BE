"use client";

import { useActionState, useState } from "react";

import {
  linkAnalysisAction,
  type LinkAnalysisState,
} from "@/app/mina-analyser/actions";

export type LinkablePropertyOption = {
  id: string;
  address: string;
  designation: string | null;
};

type Props = {
  analysisId: string;
  defaultAddress: string;
  properties: LinkablePropertyOption[];
};

const initialState: LinkAnalysisState = {};

export function LinkToPropertyForm({
  analysisId,
  defaultAddress,
  properties,
}: Props) {
  const ownerProperties = properties;
  const hasProperties = ownerProperties.length > 0;
  const [mode, setMode] = useState<"existing" | "new">(
    hasProperties ? "existing" : "new",
  );
  const [state, formAction, pending] = useActionState(
    linkAnalysisAction,
    initialState,
  );

  return (
    <section className="profile-form-panel link-analysis-panel">
      <h2 className="link-analysis-heading">Koppla till fastighet</h2>
      <p className="link-analysis-lead">
        Koppla den här analysen till en fastighet i din profil. Samma analys
        syns då både under Mina analyser och under fastigheten.
      </p>

      <form className="analyse-form" action={formAction} noValidate>
        <input type="hidden" name="analysis_id" value={analysisId} />
        <input type="hidden" name="mode" value={mode} />

        {hasProperties ? (
          <fieldset className="link-analysis-modes">
            <legend className="visually-hidden">Välj hur du kopplar</legend>
            <label className="link-analysis-mode">
              <input
                type="radio"
                name="mode_ui"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
                disabled={pending}
              />
              Befintlig fastighet
            </label>
            <label className="link-analysis-mode">
              <input
                type="radio"
                name="mode_ui"
                checked={mode === "new"}
                onChange={() => setMode("new")}
                disabled={pending}
              />
              Skapa ny fastighet
            </label>
          </fieldset>
        ) : null}

        {mode === "existing" && hasProperties ? (
          <div className="analyse-form-field">
            <label className="analyse-form-label" htmlFor="link-property-id">
              Fastighet <span aria-hidden="true">*</span>
            </label>
            <select
              id="link-property-id"
              name="property_id"
              className="analyse-form-input"
              required
              disabled={pending}
              defaultValue=""
            >
              <option value="" disabled>
                Välj fastighet
              </option>
              {ownerProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}
                  {p.designation ? ` (${p.designation})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="analyse-form-field">
            <label className="analyse-form-label" htmlFor="link-address">
              Adress <span aria-hidden="true">*</span>
            </label>
            <input
              id="link-address"
              name="address"
              type="text"
              required
              className="analyse-form-input"
              defaultValue={defaultAddress}
              disabled={pending}
            />
            <p className="analyse-form-help">
              Förifylld från analysen. Du blir ägare till den nya fastigheten.
            </p>
          </div>
        )}

        <div className="analyse-form-actions">
          <button
            type="submit"
            className="analyse-form-submit"
            disabled={pending}
          >
            {pending ? "Kopplar…" : "Koppla till profil"}
          </button>
        </div>

        {state.error ? (
          <p
            className="analyse-form-feedback analyse-form-feedback--error"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
