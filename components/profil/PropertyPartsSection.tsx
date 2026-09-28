"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useRef, useState } from "react";

import {
  addPropertyPartAction,
  deletePropertyPartAction,
  setPartNotApplicableAction,
  updatePropertyPartAction,
} from "@/app/profil/actions";
import type {
  PropertyBuildingView,
  PropertyPartView,
} from "@/lib/properties/build-property-parts";
import {
  HEAT_DIST_LABELS,
  HEAT_DIST_VARIANTS,
  HEAT_SOURCE_LABELS,
  HEAT_SOURCE_NOTES,
  HEAT_SOURCE_VARIANTS,
  lifespanForPart,
  ROOF_KNOWN_ISSUES,
  ROOF_MATERIAL_LABELS,
  ROOF_MATERIALS,
  type HeatDistVariant,
  type HeatSourceVariant,
  type RoofMaterial,
} from "@/lib/properties/component-lifespans";
import { addablePartOptions } from "@/lib/properties/parts-catalog";

type Props = {
  propertyId: string;
  buildings: PropertyBuildingView[];
  canEdit: boolean;
  /** Öppna panelen för denna del-id eller legacy part_key. */
  initialPartId?: string | null;
};

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

function refreshInBackground(router: ReturnType<typeof useRouter>) {
  startTransition(() => {
    router.refresh();
  });
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
  const activeBuilding = active
    ? buildings.find((b) => b.id === active.buildingId) ?? null
    : null;
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
                {activeBuilding?.heatCompatibilityWarning &&
                active.key === "varmekalla" ? (
                  <p className="profile-part-warning" role="status">
                    {activeBuilding.heatCompatibilityWarning}
                  </p>
                ) : null}
                {active.warning ? (
                  <p className="profile-part-warning" role="status">
                    {active.warning}
                  </p>
                ) : null}
                {active.note ? (
                  <p className="analyse-form-help">{active.note}</p>
                ) : null}
                {active.prompt ? (
                  <p className="profile-dashboard-text">{active.prompt}</p>
                ) : null}
                <p className="profile-dashboard-text">{active.summary}</p>
                <p className="profile-dashboard-text">
                  {active.lifespanYears != null && !active.integrated
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
                    hasHeatPump={activeBuilding?.hasHeatPump ?? false}
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
        <AddPartForm
          propertyId={propertyId}
          buildingId={building.id}
          existingKeys={building.parts.map((p) => p.key)}
        />
      ) : null}
    </details>
  );
}

function AddPartForm({
  propertyId,
  buildingId,
  existingKeys,
}: {
  propertyId: string;
  buildingId: string;
  existingKeys: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = addablePartOptions(existingKeys);

  if (options.length === 0) return null;

  return (
    <form
      className="profile-part-add"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        void (async () => {
          setPending(true);
          setError(null);
          try {
            const result = await addPropertyPartAction({}, new FormData(form));
            if (result.error) {
              setError(result.error);
              return;
            }
            form.reset();
            refreshInBackground(router);
          } catch {
            setError("Kunde inte lägga till delen.");
          } finally {
            setPending(false);
          }
        })();
      }}
    >
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
          {options.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
              {p.allowMultiple ? " (fler)" : ""}
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
        className="home-btn home-btn-primary profile-part-add-btn"
        disabled={pending}
      >
        {pending ? "Lägger till…" : "Lägg till"}
      </button>
      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="profile-part-verify">
      <p className="profile-dashboard-text">
        Den här delen är markerad som ej relevant för byggnaden.
      </p>
      {canEdit ? (
        <>
          <button
            type="button"
            className="home-btn home-btn-primary"
            disabled={pending}
            onClick={() => {
              void (async () => {
                setPending(true);
                setError(null);
                try {
                  const fd = new FormData();
                  fd.set("property_id", propertyId);
                  fd.set("part_id", part.id);
                  fd.set("not_applicable", "0");
                  const result = await setPartNotApplicableAction({}, fd);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  onDone();
                  refreshInBackground(router);
                } catch {
                  setError("Kunde inte uppdatera delen.");
                } finally {
                  setPending(false);
                }
              })();
            }}
          >
            {pending ? "Sparar…" : "Återställ – delen finns"}
          </button>
          <div className="profile-part-clear-form">
            <button
              type="button"
              className="profile-part-clear profile-part-clear--danger"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Ta bort ${part.label}? Du kan lägga till den igen senare.`,
                  )
                ) {
                  return;
                }
                void (async () => {
                  setPending(true);
                  setError(null);
                  try {
                    const fd = new FormData();
                    fd.set("property_id", propertyId);
                    fd.set("part_id", part.id);
                    const result = await deletePropertyPartAction({}, fd);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    onDone();
                    refreshInBackground(router);
                  } catch {
                    setError("Kunde inte ta bort delen.");
                  } finally {
                    setPending(false);
                  }
                })();
              }}
            >
              Ta bort delen
            </button>
          </div>
        </>
      ) : null}
      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PartVerifyForm({
  propertyId,
  part,
  buildYear,
  hasHeatPump,
  onDone,
}: {
  propertyId: string;
  part: PropertyPartView;
  buildYear: number | null;
  hasHeatPump: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [roofMaterial, setRoofMaterial] = useState<RoofMaterial | "">(
    part.variant &&
      (ROOF_MATERIALS as readonly string[]).includes(part.variant)
      ? (part.variant as RoofMaterial)
      : "",
  );
  const [heatSource, setHeatSource] = useState<HeatSourceVariant | "">(
    part.variant && isHeatSourcePick(part.variant)
      ? part.variant
      : "",
  );
  const [heatDist, setHeatDist] = useState<HeatDistVariant | "">(
    part.variant && isHeatDistPick(part.variant) ? part.variant : "",
  );
  const [role, setRole] = useState<"primar" | "komplement">(
    part.role === "komplement" ? "komplement" : "primar",
  );
  const [integrated, setIntegrated] = useState(part.integrated);

  const now = new Date().getFullYear();
  const activeVariant =
    part.key === "tak"
      ? roofMaterial
      : part.key === "varmekalla"
        ? heatSource
        : part.key === "varmedistribution"
          ? heatDist
          : null;
  const materialLifespan =
    activeVariant
      ? lifespanForPart(part.key, activeVariant)
      : part.lifespanYears;
  const heatNote =
    heatSource && HEAT_SOURCE_NOTES[heatSource]
      ? HEAT_SOURCE_NOTES[heatSource]
      : null;

  async function runSave(fd: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await updatePropertyPartAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      refreshInBackground(router);
    } catch {
      setError("Kunde inte spara. Försök igen.");
    } finally {
      setPending(false);
    }
  }

  async function runNotApplicable() {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("part_id", part.id);
      fd.set("not_applicable", "1");
      const result = await setPartNotApplicableAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      refreshInBackground(router);
    } catch {
      setError("Kunde inte uppdatera delen.");
    } finally {
      setPending(false);
    }
  }

  async function runDelete() {
    if (
      !window.confirm(
        `Ta bort ${part.label}? Du kan lägga till den igen senare.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("property_id", propertyId);
      fd.set("part_id", part.id);
      const result = await deletePropertyPartAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      refreshInBackground(router);
    } catch {
      setError("Kunde inte ta bort delen.");
    } finally {
      setPending(false);
    }
  }

  const skipAgeForIntegrated = part.key === "varmvattenberedare" && integrated;

  return (
    <div className="profile-part-verify">
      <form
        className="profile-part-verify-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void runSave(new FormData(e.currentTarget));
        }}
      >
        <input type="hidden" name="property_id" value={propertyId} />
        <input type="hidden" name="part_id" value={part.id} />

        {part.allowMultiple && part.key !== "varmekalla" ? (
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
                    name="variant"
                    value={key}
                    checked={roofMaterial === key}
                    onChange={() => setRoofMaterial(key)}
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
            ) : roofMaterial === "okand" || !roofMaterial ? (
              <p className="analyse-form-help">
                Välj material för att få rätt livslängdsriktvärde.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {part.key === "varmekalla" ? (
          <>
            <fieldset className="profile-part-fieldset">
              <legend>Värmekälla</legend>
              <div className="profile-part-choice-list">
                {HEAT_SOURCE_VARIANTS.map((key) => (
                  <label key={key} className="profile-part-choice">
                    <input
                      type="radio"
                      name="variant"
                      value={key}
                      checked={heatSource === key}
                      onChange={() => setHeatSource(key)}
                      disabled={pending}
                      required
                    />
                    <span>{HEAT_SOURCE_LABELS[key]}</span>
                  </label>
                ))}
              </div>
              {heatNote ? (
                <p className="analyse-form-help">{heatNote}</p>
              ) : null}
              {materialLifespan != null ? (
                <p className="analyse-form-help">
                  Riktvärde för livslängd: ca {materialLifespan} år.
                </p>
              ) : null}
            </fieldset>
            <fieldset className="profile-part-fieldset">
              <legend>Roll</legend>
              <div className="profile-part-choice-list">
                {(
                  [
                    ["primar", "Primär"],
                    ["komplement", "Komplement"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="profile-part-choice">
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => setRole(value)}
                      disabled={pending}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {part.key === "varmedistribution" ? (
          <fieldset className="profile-part-fieldset">
            <legend>Värmedistribution</legend>
            <div className="profile-part-choice-list">
              {HEAT_DIST_VARIANTS.map((key) => (
                <label key={key} className="profile-part-choice">
                  <input
                    type="radio"
                    name="variant"
                    value={key}
                    checked={heatDist === key}
                    onChange={() => setHeatDist(key)}
                    disabled={pending}
                    required
                  />
                  <span>{HEAT_DIST_LABELS[key]}</span>
                </label>
              ))}
            </div>
            {materialLifespan != null ? (
              <p className="analyse-form-help">
                Riktvärde för livslängd: ca {materialLifespan} år.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {part.key === "varmvattenberedare" && hasHeatPump ? (
          <label className="profile-part-choice">
            <input
              type="checkbox"
              name="integrated"
              value="1"
              checked={integrated}
              onChange={(e) => setIntegrated(e.target.checked)}
              disabled={pending}
            />
            <span>Integrerad i värmepumpen</span>
          </label>
        ) : null}

        {!skipAgeForIntegrated ? (
          <>
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
          </>
        ) : (
          <p className="analyse-form-help">
            Integrerad beredare har ingen egen ålder – den ingår i värmepumpen.
          </p>
        )}

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

      {part.source === "verified" ||
      part.variant ||
      part.knownIssues.length > 0 ? (
        <form
          className="profile-part-clear-form"
          onSubmit={(e) => {
            e.preventDefault();
            void runSave(new FormData(e.currentTarget));
          }}
        >
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="part_id" value={part.id} />
          <input type="hidden" name="clear" value="1" />
          {part.key === "tak" && roofMaterial ? (
            <input type="hidden" name="variant" value={roofMaterial} />
          ) : null}
          {part.key === "varmekalla" && heatSource ? (
            <>
              <input type="hidden" name="variant" value={heatSource} />
              <input type="hidden" name="role" value={role} />
            </>
          ) : null}
          {part.key === "varmedistribution" && heatDist ? (
            <input type="hidden" name="variant" value={heatDist} />
          ) : null}
          <button type="submit" className="profile-part-clear" disabled={pending}>
            Rensa till antagen
          </button>
        </form>
      ) : null}

      <div className="profile-part-clear-form">
        <button
          type="button"
          className="profile-part-clear"
          disabled={pending}
          onClick={() => void runNotApplicable()}
        >
          Finns inte / ej relevant
        </button>
      </div>

      <div className="profile-part-clear-form">
        <button
          type="button"
          className="profile-part-clear profile-part-clear--danger"
          disabled={pending}
          onClick={() => void runDelete()}
        >
          Ta bort delen
        </button>
      </div>

      {error ? (
        <p className="profile-ownership-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function isHeatSourcePick(value: string): value is HeatSourceVariant {
  return (HEAT_SOURCE_VARIANTS as readonly string[]).includes(value);
}

function isHeatDistPick(value: string): value is HeatDistVariant {
  return (HEAT_DIST_VARIANTS as readonly string[]).includes(value);
}