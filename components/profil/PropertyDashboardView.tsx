import Link from "next/link";

import { MarkBoughtHouseButton } from "@/components/profil/MarkBoughtHouseButton";
import { OwnershipStatusSwitch } from "@/components/profil/OwnershipStatusSwitch";
import { PropertyPartsSection } from "@/components/profil/PropertyPartsSection";
import { PropertyTodoList } from "@/components/profil/PropertyTodoList";
import { UnlinkAnalysisButton } from "@/components/mina-analyser/UnlinkAnalysisButton";
import type { PropertyDashboard } from "@/lib/properties/get-property-dashboard";
import {
  ownershipStatusLabel,
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

  const timeline: { key: string; label: string; date: string; href?: string }[] =
    [
      {
        key: "created",
        label: "Fastigheten lades till i Byggello",
        date: property.created_at,
      },
      ...property.analyses.map((a) => ({
        key: `analysis-${a.id}`,
        label: "AI-analys kopplad",
        date: a.created_at,
        href: `/mina-analyser/${a.id}`,
      })),
    ].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  return (
    <div className="profile-dashboard">
      <header className="profile-dashboard-header">
        <div className="profile-dashboard-header-main">
          <h1 className="profile-dashboard-title">{property.address}</h1>
          {bits.length > 0 ? (
            <p className="profile-dashboard-meta">{bits.join(" · ")}</p>
          ) : null}
          <p className="profile-dashboard-role">
            Din roll: {propertyRoleLabel(property.role)}
            {property.ownership_status === "ager" && ownedSince
              ? ` · Äger sedan ${ownedSince}`
              : ` · ${ownershipStatusLabel(property.ownership_status)}`}
          </p>
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
            className="profile-dashboard-panel"
            aria-labelledby="profile-next-heading"
          >
            <h2 id="profile-next-heading" className="profile-dashboard-heading">
              Nästa steg
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
            initialPartKey={openPartKey}
          />

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
            <p className="profile-complete-percent">{completeness.percent} %</p>
            <div
              className="profile-complete-bar"
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profilens kompletthet"
            >
              <span
                className="profile-complete-bar-fill"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <p className="profile-dashboard-text">{completeness.missingHint}</p>
            <p className="profile-complete-meta">
              {completeness.verifiedParts} av {completeness.totalParts} delar
              verifierade
            </p>
          </section>

          <section
            className="profile-dashboard-panel"
            aria-labelledby="profile-timeline-heading"
          >
            <h2
              id="profile-timeline-heading"
              className="profile-dashboard-heading"
            >
              Tidslinje
            </h2>
            <ol className="profile-timeline">
              {timeline.map((item) => (
                <li key={item.key} className="profile-timeline-item">
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                  {item.href ? (
                    <Link href={item.href}>{item.label}</Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section
            className="profile-dashboard-panel profile-dashboard-panel--teaser"
            aria-labelledby="profile-docs-heading"
          >
            <h2 id="profile-docs-heading" className="profile-dashboard-heading">
              Dokument
            </h2>
            <p className="profile-dashboard-text">
              Samla husets papper på ett ställe.
            </p>
            <p className="profile-teaser-badge">Detta kommer</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
