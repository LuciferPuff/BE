import Link from "next/link";

import { MarkBoughtHouseButton } from "@/components/profil/MarkBoughtHouseButton";
import { NotifyMeButton } from "@/components/profil/NotifyMeButton";
import { OwnershipStatusSwitch } from "@/components/profil/OwnershipStatusSwitch";
import { PropertyDocumentsSection } from "@/components/profil/PropertyDocumentsSection";
import { PropertyPartsSection } from "@/components/profil/PropertyPartsSection";
import { PropertyTimelineSection } from "@/components/profil/PropertyTimelineSection";
import { PropertyTodoList } from "@/components/profil/PropertyTodoList";
import { UnlinkAnalysisButton } from "@/components/mina-analyser/UnlinkAnalysisButton";
import type { PropertyDashboard } from "@/lib/properties/get-property-dashboard";
import {
  propertyRoleLabel,
  propertyTypeLabel,
} from "@/lib/properties/labels";

type Props = {
  property: PropertyDashboard;
  openPartKey?: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function metaBits(property: PropertyDashboard): string[] {
  const bits: string[] = [];
  if (property.designation?.trim()) bits.push(property.designation.trim());
  if (property.construction_year != null) {
    bits.push(`Byggår ${property.construction_year}`);
  }
  bits.push(propertyTypeLabel(property.property_type));
  if (
    property.living_area_sqm != null &&
    Number.isFinite(property.living_area_sqm)
  ) {
    bits.push(`${property.living_area_sqm} m²`);
  }
  const place = property.kommun?.trim() || property.city?.trim();
  if (place) bits.push(place);
  return bits.filter((b) => b && b !== "—");
}

function resolveNextStepHref(
  property: PropertyDashboard,
  ctaHref: string | undefined,
): string | null {
  if (!ctaHref) return null;
  if (ctaHref === "redigera") return `/profil/${property.id}/redigera`;
  if (ctaHref === "latest-analysis") {
    return property.analyses[0]
      ? `/mina-analyser/${property.analyses[0].id}`
      : null;
  }
  if (ctaHref.startsWith("?")) return `/profil/${property.id}${ctaHref}`;
  if (ctaHref.startsWith("#")) return ctaHref;
  return ctaHref;
}

export function PropertyDashboardView({
  property,
  openPartKey = null,
}: Props) {
  const canEdit = property.role === "agare" || property.role === "medlem";
  const canOwnStatus = property.role === "agare";
  const bits = metaBits(property);
  const ownedSince = property.purchase_date
    ? new Date(property.purchase_date).getFullYear()
    : null;
  const { completeness, nextStep } = property;
  const nextHref = resolveNextStepHref(property, nextStep.ctaHref);
  const showBoughtPrimary =
    canOwnStatus &&
    property.ownership_status === "funderar" &&
    (nextStep.showBoughtButton || !nextHref);
  const showRole = property.memberCount > 1;
  const showAnalyses =
    property.ownership_status === "funderar" ||
    property.analyses.length > 0;
  const interested = new Set(property.interestedFeatures);

  const analysesSection = showAnalyses ? (
    <section
      className="profile-dashboard-panel"
      aria-labelledby="profile-analyses-heading"
    >
      <h2
        id="profile-analyses-heading"
        className="profile-dashboard-heading"
      >
        Analyser
      </h2>
      {property.analyses.length > 0 ? (
        <ul className="profile-linked-list">
          {property.analyses.map((analysis) => (
            <li key={analysis.id} className="profile-linked-item">
              <Link
                href={`/mina-analyser/${analysis.id}`}
                className="profile-linked-link"
              >
                <span>{analysis.address}</span>
                <span className="profile-linked-date">
                  {formatDate(analysis.created_at)}
                </span>
              </Link>
              {canOwnStatus ? (
                <UnlinkAnalysisButton
                  analysisId={analysis.id}
                  returnTo="profil"
                  variant="inline"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="profile-dashboard-empty">
          <p>Inga kopplade analyser ännu.</p>
          <Link href="/analys" className="profile-edit-link">
            Analysera det här huset
          </Link>
        </div>
      )}
    </section>
  ) : null;

  return (
    <div className="profile-dashboard">
      <header className="profile-dashboard-header">
        <div className="profile-dashboard-header-main">
          <h1 className="profile-dashboard-title">{property.address}</h1>
          {bits.length > 0 ? (
            <p className="profile-dashboard-meta">{bits.join(" · ")}</p>
          ) : null}
          {showRole ||
          (property.ownership_status === "ager" && ownedSince) ? (
            <p className="profile-dashboard-role">
              {showRole ? `Din roll: ${propertyRoleLabel(property.role)}` : null}
              {showRole &&
              property.ownership_status === "ager" &&
              ownedSince
                ? " · "
                : null}
              {property.ownership_status === "ager" && ownedSince
                ? `Äger sedan ${ownedSince}`
                : null}
            </p>
          ) : null}
        </div>
        <div className="profile-dashboard-header-actions">
          {canOwnStatus ? (
            <>
              <OwnershipStatusSwitch
                propertyId={property.id}
                value={property.ownership_status}
              />
              <Link
                href={`/profil/${property.id}/redigera`}
                className="profile-edit-link"
              >
                Redigera uppgifter
              </Link>
            </>
          ) : null}
        </div>
      </header>

      <div className="profile-dashboard-grid">
        <div className="profile-dashboard-primary">
          <section
            className={
              nextStep.tone === "warning"
                ? "profile-dashboard-panel profile-next-panel profile-next-panel--warning"
                : "profile-dashboard-panel profile-next-panel"
            }
            aria-labelledby="profile-next-heading"
          >
            <p className="profile-next-badge">Nästa steg</p>
            <h2 id="profile-next-heading" className="profile-dashboard-heading">
              {nextStep.title}
            </h2>
            <p className="profile-dashboard-text">{nextStep.body}</p>
            <div className="profile-next-actions">
              {showBoughtPrimary && !nextHref ? (
                <MarkBoughtHouseButton propertyId={property.id} />
              ) : null}
              {nextHref ? (
                <Link href={nextHref} className="home-btn home-btn-primary">
                  {nextStep.ctaLabel}
                </Link>
              ) : null}
              {canOwnStatus &&
              property.ownership_status === "funderar" &&
              nextHref ? (
                <MarkBoughtHouseButton
                  propertyId={property.id}
                  variant="secondary"
                />
              ) : null}
            </div>
          </section>

          <PropertyTodoList
            propertyId={property.id}
            todos={property.todos}
            canEdit={canEdit}
          />

          <PropertyPartsSection
            propertyId={property.id}
            parts={property.parts}
            canEdit={canEdit}
            constructionYear={property.construction_year}
            initialPartKey={openPartKey}
          />

          <section
            className="profile-dashboard-panel profile-dashboard-panel--teaser"
            aria-labelledby="profile-economy-heading"
          >
            <h2
              id="profile-economy-heading"
              className="profile-dashboard-heading"
            >
              Kommande kostnader
            </h2>
            <p className="profile-dashboard-text">
              Se vad huset troligen kostar i underhåll de närmaste 1, 5 och 10
              åren.
            </p>
            <p className="profile-teaser-badge">Detta kommer</p>
            <NotifyMeButton
              feature="ekonomi"
              propertyId={property.id}
              alreadyInterested={interested.has("ekonomi")}
            />
          </section>

          {property.ownership_status === "funderar" ? analysesSection : null}
        </div>

        <aside className="profile-dashboard-aside">
          <section
            className="profile-dashboard-panel"
            aria-labelledby="profile-complete-heading"
          >
            <h2
              id="profile-complete-heading"
              className="profile-dashboard-heading"
            >
              Profilen
            </h2>
            <p className="profile-complete-meta profile-complete-meta--lead">
              {completeness.verifiedParts} av {completeness.totalParts} delar
              verifierade
            </p>
            <div
              className="profile-complete-bar"
              role="progressbar"
              aria-valuenow={completeness.verifiedParts}
              aria-valuemin={0}
              aria-valuemax={completeness.totalParts}
              aria-label="Verifierade husdelar"
            >
              <span
                className="profile-complete-bar-fill"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
          </section>

          <PropertyTimelineSection
            propertyId={property.id}
            timeline={property.timeline}
            canEdit={canEdit}
            canDelete={canOwnStatus}
          />

          <PropertyDocumentsSection
            propertyId={property.id}
            documents={property.documents}
            canEdit={canEdit}
            canDelete={canOwnStatus}
          />
        </aside>
      </div>

      {property.ownership_status === "ager" && analysesSection ? (
        <div className="profile-dashboard-footer-block">{analysesSection}</div>
      ) : null}
    </div>
  );
}
