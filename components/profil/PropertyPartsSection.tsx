"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  addPropertyPartAction,
  setPartNotApplicableAction,
  updatePropertyPartAction,
  type UpdatePropertyPartState,
} from "@/app/profil/actions";
import type {
  PropertyBuildingView,
  PropertyPartView,
} from "@/lib/properties/build-property-parts";
import {
  lifespanForPart,
  ROOF_KNOWN_ISSUES,
  ROOF_MATERIAL_LABELS,
  ROOF_MATERIALS,
  type RoofMaterial,
} from "@/lib/properties/component-lifespans";
import {
  PROPERTY_PARTS,
} from "@/lib/properties/parts-catalog";

type Props = {
  propertyId: string;
  buildings: PropertyBuildingView[];
  canEdit: boolean;
  /** Öppna panelen för denna del-id eller legacy part_key. */
  initialPartId?: string | null;
};

const initialState: UpdatePropertyPartState = {};

function decadeOptions(maxYear: number): number[] {
  const start = 1950;
  const last = Math.floor(maxYear / 10) * 10;
  const out: number[] = [];
  for (let y = last; y >= start; y -= 10) out.push(y);
  return out;
}

function findPart(
  buildings: PropertyBuildingView[],
  idOrKey: string | null | undefined,
): PropertyPartView | null {
  if (!idOrKey) return null;
  for (const b of buildings) {
    const byId = b.parts.find((p) => p.id === idOrKey);
    if (byId) return byId;
  }
  for (const b of buildings) {
    const byKey = b.parts.find((p) => p.key === idOrKey);
    if (byKey) return byKey;
  }
  return null;
}

export function PropertyPartsSection({
  propertyId,
  buildings,
  canEdit,
  initialPartId = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const openedFromQuery = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = findPart(buildings, activeId);
  const titleId = useId();

  useEffect(() => {
    if (!initialPartId) return;
    if (openedFromQuery.current === initialPartId) return;
    const match = findPart(buildings, initialPartId);
    if (!match) return;
    openedFromQuery.current = initialPartId;
    setActiveId(match.id);
  }, [initialPartId, buildings]);

  function closeSheet() {
    setActiveId(null);
    if (initialPartId) {
      router.replace(pathname, { scroll: false });
    }
  }

  useEffect(() => {
    if (!activeId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, initialPartId, pathname]);

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
        Heldragen färg = verifierat. Dämpat = antaget från byggnadens byggår.
        Markera &quot;Finns inte&quot; om delen saknas.
      </p>

      <div className="profile-buildings">
        {buildings.map((building) => (
          <BuildingBlock
            key={building.id}
            propertyId={propertyId}
            building={building}
            canEdit={canEdit}
            defaultOpen={building.type === "huvudbyggnad"}
            onOpenPart={setActiveId}
          />
        ))}
      </div>

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

            {active.notApplicable ? (
              <NotApplicablePanel
                propertyId={propertyId}
                part={active}
                canEdit={canEdit}
                onDone={closeSheet}
              />
            ) : (
              <>
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
                    buildYear={active.buildYear}
                    onDone={closeSheet}
                  />
                ) : (
                  <p className="analyse-form-help">
                    Endast ägare eller medlem kan uppdatera husdelar.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BuildingBlock({
  propertyId,
  building,
  canEdit,
  defaultOpen,
  onOpenPart,
}: {
  propertyId: string;
  building: PropertyBuildingView;
  canEdit: boolean;
  defaultOpen: boolean;
  onOpenPart: (id: string) => void;
}) {
  const yearLabel =
    building.buildYear != null ? ` · Byggår ${building.buildYear}` : "";

  return (
    <details className="profile-building" open={defaultOpen}>
      <summary className="profile-building-summary">
        <span className="profile-building-name">
          {building.name}
          {yearLabel}
        </span>
        <span className="profile-building-meta">
          {building.verifiedCount}/{building.relevantCount} verifierade
          {building.type !== "huvudbyggnad"
            ? ` · ${building.collapsedSummary}`
            : null}
        </span>
      </summary>

      <ul className="profile-parts-grid">
        {building.parts.map((part) => (
          <li key={part.id}>
            <button
              type="button"
              className={`profile-part-tile profile-part-tile--${part.tone} profile-part-tile--${part.emphasis}${
                part.source === "verified" ? " profile-part-tile--verified" : ""
              }`}
              onClick={() => onOpenPart(part.id)}
            >
              <span className="profile-part-tile-status">
                {part.source === "verified" ? "✓ " : null}
                {part.statusLabel}
              </span>
              <span className="profile-part-tile-label">{part.label}</span>
              <span className="profile-part-tile-age">{part.ageLabel}</span>
              <span className="profile-part-tile-action">{part.actionLabel}</span>
            </button>
          </li>
        ))}
      </ul>

      {canEdit ? (
        <AddPartForm propertyId={propertyId} buildingId={building.id} />
      ) : null}
    </details>
  );
}

function AddPartForm({
  propertyId,
  buildingId,
}: {
  propertyId: string;
  buildingId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    addPropertyPartAction,
    initialState,
  );
  const multiParts = PROPERTY_PARTS.filter((p) => p.allowMultiple);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="profile-part-add">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="building_id" value={buildingId} />
      <label className="profile-part-field">
        <span>Lägg till del</span>
        <select
          name="part_key"
          className="analyse-form-input"
          required
          disabled={pending}
          defaultValue=""
        >
          <option value="" disabled>
            Välj typ…
          </option>
          {multiParts.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="profile-part-field">
        <span>Namn (valfritt)</span>
        <input
          type="text"
          name="name"
          className="analyse-form-input"
          maxLength={80}
          disabled={pending}
          placeholder="t.ex. Övre badrum"
        />
      </label>
      <button
        type="submit"
        className="home-btn home-btn-ghost"
        disabled={pending}
      >
        {pending ? "Lägger till…" : "Lägg till"}
      </button>
      {state.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function NotApplicablePanel({
  propertyId,
  part,
  canEdit,
  onDone,
}: {
  propertyId: string;
  part: PropertyPartView;
  canEdit: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    setPartNotApplicableAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="profile-part-verify">
      <p className="profile-dashboard-text">
        Den här delen är markerad som ej relevant för byggnaden.
      </p>
      {canEdit ? (
        <form action={formAction}>
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="part_id" value={part.id} />
          <input type="hidden" name="not_applicable" value="0" />
          <button
            type="submit"
            className="home-btn home-btn-primary"
            disabled={pending}
          >
            {pending ? "Sparar…" : "Återställ – delen finns"}
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

function PartVerifyForm({
  propertyId,
  part,
  buildYear,
  onDone,
}: {
  propertyId: string;
  part: PropertyPartView;
  buildYear: number | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updatePropertyPartAction,
    initialState,
  );
  const [naState, naAction, naPending] = useActionState(
    setPartNotApplicableAction,
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
    if (state.ok || naState.ok) {
      router.refresh();
      onDone();
    }
  }, [state.ok, naState.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="profile-part-verify">
      <form action={formAction} className="profile-part-verify-stack">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="part_id" value={part.id} />

        {part.allowMultiple ? (
          <label className="profile-part-field">
            <span>Namn</span>
            <input
              type="text"
              name="name"
              className="analyse-form-input"
              maxLength={80}
              defaultValue={part.name ?? ""}
              placeholder={part.catalogLabel}
              disabled={pending}
            />
          </label>
        ) : null}

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
            {buildYear != null
              ? `Räknas som original från byggnadens byggår ${buildYear}.`
              : "Ange byggår på byggnaden först."}
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
            disabled={pending || naPending}
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
        </div>
      </form>

      {part.source === "verified" ||
      part.material ||
      part.knownIssues.length > 0 ? (
        <form action={formAction} className="profile-part-clear-form">
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="part_id" value={part.id} />
          <input type="hidden" name="clear" value="1" />
          {part.key === "tak" && material ? (
            <input type="hidden" name="material" value={material} />
          ) : null}
          <button
            type="submit"
            className="profile-part-clear"
            disabled={pending || naPending}
          >
            Rensa till antagen
          </button>
        </form>
      ) : null}

      <form action={naAction} className="profile-part-clear-form">
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="part_id" value={part.id} />
        <input type="hidden" name="not_applicable" value="1" />
        <button
          type="submit"
          className="profile-part-clear"
          disabled={pending || naPending}
        >
          Finns inte / ej relevant
        </button>
      </form>

      {state.error || naState.error ? (
        <p className="profile-ownership-error" role="alert">
          {state.error || naState.error}
        </p>
      ) : null}
    </div>
  );
}