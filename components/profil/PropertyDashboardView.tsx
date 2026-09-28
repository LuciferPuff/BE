import Link from "next/link";
import { Suspense } from "react";

import { MarkBoughtHouseButton } from "@/components/profil/MarkBoughtHouseButton";
import { NotifyMeButton } from "@/components/profil/NotifyMeButton";
import { NextStepCta } from "@/components/profil/NextStepCta";
import { OwnershipStatusSwitch } from "@/components/profil/OwnershipStatusSwitch";
import {
  ProfileAsideSkeleton,
  ProfilePanelSkeleton,
} from "@/components/profil/ProfileDashboardSkeletons";
import {
  PropertyDashboardAnalyses,
  PropertyDashboardAside,
} from "@/components/profil/PropertyDashboardSecondary";
import { PropertyPartsSection } from "@/components/profil/PropertyPartsSection";
import { PropertyTodoList } from "@/components/profil/PropertyTodoList";
import type { PropertyDashboardCore } from "@/lib/properties/get-property-dashboard";
import {
  propertyRoleLabel,
  propertyTypeLabel,
} from "@/lib/properties/labels";

type Props = {
  property: PropertyDashboardCore;
  userId: string;
  openPartId?: string | null;
};

function metaBits(property: PropertyDashboardCore): string[] {
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
  property: PropertyDashboardCore,
  ctaHref: string | undefined,
): string | null {
  if (!ctaHref) return null;
  if (ctaHref === "redigera") return `/profil/${property.id}/redigera`;
  if (ctaHref === "latest-analysis") {
    // Full analyslista streamas separat; fallback till analysflödet.
    return property.hasAnalysis ? "/mina-analyser" : "/analys";
  }
  if (ctaHref.startsWith("?")) return `/profil/${property.id}${ctaHref}`;
  if (ctaHref.startsWith("#")) return ctaHref;
  return ctaHref;
}

export function PropertyDashboardView({
  property,
  userId,
  openPartId = null,
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
  const interested = new Set(property.interestedFeatures);

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
                <NextStepCta href={nextHref} label={nextStep.ctaLabel} />
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
            buildings={property.buildings}
            canEdit={canEdit}
            initialPartId={openPartId}
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

          {property.ownership_status === "funderar" ? (
            <Suspense fallback={<ProfilePanelSkeleton label="Laddar analyser" />}>
              <PropertyDashboardAnalyses
                propertyId={property.id}
                userId={userId}
                createdAt={property.created_at}
                ownershipStatus={property.ownership_status}
                role={property.role}
                placement="primary"
              />
            </Suspense>
          ) : null}
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

          <Suspense fallback={<ProfileAsideSkeleton />}>
            <PropertyDashboardAside
              propertyId={property.id}
              userId={userId}
              createdAt={property.created_at}
              role={property.role}
            />
          </Suspense>
        </aside>
      </div>

      {property.ownership_status === "ager" ? (
        <Suspense fallback={null}>
          <PropertyDashboardAnalyses
            propertyId={property.id}
            userId={userId}
            createdAt={property.created_at}
            ownershipStatus={property.ownership_status}
            role={property.role}
            placement="footer"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
