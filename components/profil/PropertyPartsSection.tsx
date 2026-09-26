"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  updatePropertyPartAction,
  type UpdatePropertyPartState,
} from "@/app/profil/actions";
import type { PropertyPartView } from "@/lib/properties/build-property-parts";
import {
  lifespanForPart,
  ROOF_KNOWN_ISSUES,
  ROOF_MATERIAL_LABELS,
  ROOF_MATERIALS,
  type RoofMaterial,
} from "@/lib/properties/component-lifespans";

type Props = {
  propertyId: string;
  parts: PropertyPartView[];
  canEdit: boolean;
  constructionYear: number | null;
  /** Öppna panelen för denna del (t.ex. gammal ?del=-länk). */
  initialPartKey?: string | null;
};

const initialState: UpdatePropertyPartState = {};

function decadeOptions(maxYear: number): number[] {
  const start = 1950;
  const last = Math.floor(maxYear / 10) * 10;
  const out: number[] = [];
  for (let y = last; y >= start; y -= 10) out.push(y);
  return out;
}

export function PropertyPartsSection({
  propertyId,
  parts,
  canEdit,
  constructionYear,
  initialPartKey = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const openedFromQuery = useRef<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = parts.find((p) => p.key === activeKey) ?? null;
  const titleId = useId();

  useEffect(() => {
    if (!initialPartKey) return;
    if (openedFromQuery.current === initialPartKey) return;
    if (!parts.some((p) => p.key === initialPartKey)) return;
    openedFromQuery.current = initialPartKey;
    setActiveKey(initialPartKey);
  }, [initialPartKey, parts]);

  function closeSheet() {
    setActiveKey(null);
    if (initialPartKey) {
      router.replace(pathname, { scroll: false });
    }
  }

  useEffect(() => {
    if (!activeKey) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, initialPartKey, pathname]);

  return (
    <section
      className="profile-dashboard-panel"
      id="husets-delar"
      aria-labelledby="profile-parts-heading"
    >
      <h2 id="profile-parts-heading" className="profile-dashboard-heading">
        Husets delar
      </h2>
      <p className="profile-dashboard-text">
        Heldragen färg = verifierat. Dämpat = antaget från byggår. Klicka på en
        del för att ange när den byttes.
      </p>
      <ul className="profile-parts-grid">
        {parts.map((part) => (
          <li key={part.key}>
            <button
              type="button"
              className={`profile-part-tile profile-part-tile--${part.tone} profile-part-tile--${part.emphasis}`}
              onClick={() => setActiveKey(part.key)}
            >
              <span className="profile-part-tile-status">{part.statusLabel}</span>
              <span className="profile-part-tile-label">{part.label}</span>
              <span className="profile-part-tile-age">{part.ageLabel}</span>
              <span className="profile-part-tile-action">{part.actionLabel}</span>
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
            onClick={closeSheet}
          />
          <div className="profile-part-sheet-panel">
            <div className="profile-part-sheet-head">
              <h3 id={titleId}>{active.label}</h3>
              <button
                type="button"
                className="profile-part-sheet-close"
                onClick={closeSheet}
              >
                Stäng
              </button>
            </div>
            <p
              className={`profile-part-badge profile-part-badge--${active.tone}`}
            >
              {active.statusLabel}
            </p>
            {active.warning ? (
              <p className="profile-part-warning" role="status">
                {active.warning}
              </p>
            ) : null}
            {active.prompt ? (
              <p className="profile-dashboard-text">{active.prompt}</p>
            ) : null}
            <p className="profile-dashboard-text">{active.summary}</p>
            <p className="profile-dashboard-text">
              {active.lifespanYears != null
                ? `Normal livslängd ca ${active.lifespanYears} år. `
                : null}
              {active.ifWaiting}
            </p>
            {active.guideHref ? (
              <p>
                <Link href={active.guideHref} className="profile-edit-link">
                  Läs mer
                </Link>
              </p>
            ) : null}

            {canEdit ? (
              <PartVerifyForm
                propertyId={propertyId}
                part={active}
                constructionYear={constructionYear}
                onDone={closeSheet}
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
  constructionYear,
  onDone,
}: {
  propertyId: string;
  part: PropertyPartView;
  constructionYear: number | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updatePropertyPartAction,
    initialState,
  );
  const [precision, setPrecision] = useState<
    "exact" | "decade" | "original" | "unknown"
  >(
    part.yearPrecision === "decade"
      ? "decade"
      : part.yearPrecision === "original"
        ? "original"
        : part.replacedYear != null
          ? "exact"
          : "exact",
  );
  const [material, setMaterial] = useState<RoofMaterial | "">(
    part.material &&
      (ROOF_MATERIALS as readonly string[]).includes(part.material)
      ? (part.material as RoofMaterial)
      : "",
  );

  const now = new Date().getFullYear();
  const materialLifespan =
    part.key === "tak" && material
      ? lifespanForPart("tak", material)
      : part.lifespanYears;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="profile-part-verify">
      <form action={formAction} className="profile-part-verify-stack">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="part_key" value={part.key} />

        {part.key === "tak" ? (
          <fieldset className="profile-part-fieldset">
            <legend>Takmaterial</legend>
            <div className="profile-part-choice-list">
              {ROOF_MATERIALS.map((key) => (
                <label key={key} className="profile-part-choice">
                  <input
                    type="radio"
                    name="material"
                    value={key}
                    checked={material === key}
                    onChange={() => setMaterial(key)}
                    disabled={pending}
                    required
                  />
                  <span>{ROOF_MATERIAL_LABELS[key]}</span>
                </label>
              ))}
            </div>
            {materialLifespan != null ? (
              <p className="analyse-form-help">
                Riktvärde för livslängd: ca {materialLifespan} år.
              </p>
            ) : material === "okand" || !material ? (
              <p className="analyse-form-help">
                Välj material för att få rätt livslängdsriktvärde.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <fieldset className="profile-part-fieldset">
          <legend>När byttes / renoverades delen?</legend>
          <div className="profile-part-choice-list">
            {(
              [
                ["exact", "Exakt år"],
                ["decade", "Årtionde"],
                ["original", "Original från byggår"],
                ["unknown", "Vet ej"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="profile-part-choice">
                <input
                  type="radio"
                  name="year_precision"
                  value={value}
                  checked={precision === value}
                  onChange={() => setPrecision(value)}
                  disabled={pending}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {precision === "exact" ? (
          <label className="profile-part-field">
            <span>År</span>
            <input
              type="text"
              name="replaced_year"
              className="analyse-form-input"
              inputMode="numeric"
              pattern="[0-9]{4}"
              defaultValue={
                part.yearPrecision === "exact" && part.replacedYear != null
                  ? String(part.replacedYear)
                  : ""
              }
              placeholder="t.ex. 2012"
              disabled={pending}
              autoComplete="off"
            />
          </label>
        ) : null}

        {precision === "decade" ? (
          <label className="profile-part-field">
            <span>Årtionde</span>
            <select
              name="decade"
              className="analyse-form-input"
              defaultValue={
                part.yearPrecision === "decade" && part.replacedYear != null
                  ? String(Math.floor(part.replacedYear / 10) * 10)
                  : ""
              }
              disabled={pending}
              required
            >
              <option value="">Välj årtionde</option>
              {decadeOptions(now).map((y) => (
                <option key={y} value={y}>
                  {y}-tal
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {precision === "original" ? (
          <p className="analyse-form-help">
            {constructionYear != null
              ? `Räknas som original från byggår ${constructionYear}.`
              : "Ange byggår på fastigheten först."}
          </p>
        ) : null}

        {part.key === "tak" ? (
          <fieldset className="profile-part-fieldset">
            <legend>Kända problem</legend>
            <div className="profile-part-choice-list">
              {ROOF_KNOWN_ISSUES.map((issue) => (
                <label key={issue.key} className="profile-part-choice">
                  <input
                    type="checkbox"
                    name="known_issues"
                    value={issue.key}
                    defaultChecked={part.knownIssues.includes(issue.key)}
                    disabled={pending}
                  />
                  <span>{issue.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="profile-part-verify-actions">
          <button
            type="submit"
            className="home-btn home-btn-primary"
            disabled={pending}
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
        </div>
      </form>

      {part.source === "verified" || part.material || part.knownIssues.length > 0 ? (
        <form action={formAction} className="profile-part-clear-form">
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="part_key" value={part.key} />
          <input type="hidden" name="clear" value="1" />
          {part.key === "tak" && material ? (
            <input type="hidden" name="material" value={material} />
          ) : null}
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
