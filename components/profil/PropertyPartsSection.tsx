"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";

import {
  updatePropertyPartAction,
  type UpdatePropertyPartState,
} from "@/app/profil/actions";
import type { PropertyPartView } from "@/lib/properties/build-property-parts";

type Props = {
  propertyId: string;
  parts: PropertyPartView[];
  canEdit: boolean;
  /** Öppna panelen för denna del (t.ex. från Nästa steg). */
  initialPartKey?: string | null;
};

const initialState: UpdatePropertyPartState = {};

export function PropertyPartsSection({
  propertyId,
  parts,
  canEdit,
  initialPartKey = null,
}: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(
    initialPartKey && parts.some((p) => p.key === initialPartKey)
      ? initialPartKey
      : null,
  );
  const active = parts.find((p) => p.key === activeKey) ?? null;
  const titleId = useId();

  useEffect(() => {
    if (!activeKey) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveKey(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeKey]);

  return (
    <section
      className="profile-dashboard-panel"
      aria-labelledby="profile-parts-heading"
    >
      <h2 id="profile-parts-heading" className="profile-dashboard-heading">
        Husets delar
      </h2>
      <p className="profile-dashboard-text">
        Grått är okänt, färger bygger på ålder. Antagen från byggår tills du
        verifierar.
      </p>
      <ul className="profile-parts-grid">
        {parts.map((part) => (
          <li key={part.key}>
            <button
              type="button"
              className={`profile-part-tile profile-part-tile--${part.tone}`}
              onClick={() => setActiveKey(part.key)}
            >
              <span className="profile-part-tile-status">{part.statusLabel}</span>
              <span className="profile-part-tile-label">{part.label}</span>
              <span className="profile-part-tile-age">{part.ageLabel}</span>
              <span className="profile-part-tile-source">{part.sourceLabel}</span>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          className="profile-part-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="profile-part-sheet-backdrop"
            aria-label="Stäng"
            onClick={() => setActiveKey(null)}
          />
          <div className="profile-part-sheet-panel">
            <div className="profile-part-sheet-head">
              <h3 id={titleId}>{active.label}</h3>
              <button
                type="button"
                className="profile-part-sheet-close"
                onClick={() => setActiveKey(null)}
              >
                Stäng
              </button>
            </div>
            <p
              className={`profile-part-badge profile-part-badge--${active.tone}`}
            >
              {active.statusLabel} · {active.sourceLabel}
            </p>
            <p className="profile-dashboard-text">{active.summary}</p>
            <p className="profile-dashboard-text">
              Normal livslängd ca {active.lifespanYears} år. {active.ifWaiting}
            </p>
            {active.guideHref ? (
              <p>
                <Link href={active.guideHref} className="profile-edit-link">
                  Läs mer i guiderna
                </Link>
              </p>
            ) : null}

            {canEdit ? (
              <PartVerifyForm
                propertyId={propertyId}
                part={active}
                onDone={() => setActiveKey(null)}
              />
            ) : (
              <p className="analyse-form-help">
                Endast ägare eller medlem kan uppdatera husdelar.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PartVerifyForm({
  propertyId,
  part,
  onDone,
}: {
  propertyId: string;
  part: PropertyPartView;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updatePropertyPartAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps -- stäng bara vid lyckat sparande

  return (
    <div className="profile-part-verify">
      <p className="profile-part-verify-label">Uppdatera: byttes år</p>
      <form action={formAction} className="profile-part-verify-form">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="part_key" value={part.key} />
        <input
          type="number"
          name="replaced_year"
          className="analyse-form-input"
          min={1800}
          max={new Date().getFullYear() + 1}
          defaultValue={part.replacedYear ?? ""}
          placeholder="t.ex. 2012"
          disabled={pending}
          required
        />
        <button
          type="submit"
          className="home-btn home-btn-primary"
          disabled={pending}
        >
          {pending ? "Sparar…" : "Spara"}
        </button>
      </form>
      {part.source === "verified" ? (
        <form action={formAction}>
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="part_key" value={part.key} />
          <input type="hidden" name="clear" value="1" />
          <button
            type="submit"
            className="profile-part-clear"
            disabled={pending}
          >
            Rensa till antagen
          </button>
        </form>
      ) : null}
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
