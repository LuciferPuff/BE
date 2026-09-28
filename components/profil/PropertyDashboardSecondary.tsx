import { PropertyAnalysesList } from "@/components/profil/PropertyAnalysesList";
import { PropertyDocumentsSectionLazy } from "@/components/profil/PropertyDocumentsSectionLazy";
import { PropertyTimelineSection } from "@/components/profil/PropertyTimelineSection";
import { getPropertyDashboardSecondary } from "@/lib/properties/get-property-dashboard";
import type { OwnershipStatus } from "@/lib/properties/labels";

type AsideProps = {
  propertyId: string;
  userId: string;
  createdAt: string;
  role: string;
};

export async function PropertyDashboardAside({
  propertyId,
  userId,
  createdAt,
  role,
}: AsideProps) {
  const secondary = await getPropertyDashboardSecondary(
    propertyId,
    userId,
    createdAt,
  );
  if (!secondary) return null;

  const canEdit = role === "agare" || role === "medlem";
  const canDelete = role === "agare";

  return (
    <>
      <PropertyTimelineSection
        propertyId={propertyId}
        createdAt={createdAt}
        timeline={secondary.timeline}
        initialOffsets={{
          analyses: secondary.analyses.length,
          documents: secondary.documents.length,
          events: secondary.events.length,
        }}
        initialHasMore={secondary.timelineHasMore}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      <PropertyDocumentsSectionLazy
        propertyId={propertyId}
        documents={secondary.documents}
        documentsHasMore={secondary.documentsHasMore}
        folderCounts={secondary.documentFolderCounts}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}

type AnalysesProps = {
  propertyId: string;
  userId: string;
  createdAt: string;
  ownershipStatus: OwnershipStatus;
  role: string;
  placement: "primary" | "footer";
};

export async function PropertyDashboardAnalyses({
  propertyId,
  userId,
  createdAt,
  ownershipStatus,
  role,
  placement,
}: AnalysesProps) {
  const showInPrimary = ownershipStatus === "funderar" && placement === "primary";
  const showInFooter = ownershipStatus === "ager" && placement === "footer";
  if (!showInPrimary && !showInFooter) return null;

  const secondary = await getPropertyDashboardSecondary(
    propertyId,
    userId,
    createdAt,
  );
  if (!secondary) return null;

  // Hide empty analyses for owners (footer); buyers always see the section.
  if (ownershipStatus === "ager" && secondary.analyses.length === 0) {
    return null;
  }

  const canUnlink = role === "agare";
  const section = (
    <section
      className="profile-dashboard-panel"
      aria-labelledby="profile-analyses-heading"
    >
      <h2 id="profile-analyses-heading" className="profile-dashboard-heading">
        Analyser
      </h2>
      <PropertyAnalysesList
        propertyId={propertyId}
        initialAnalyses={secondary.analyses}
        initialHasMore={secondary.analysesHasMore}
        canUnlink={canUnlink}
      />
    </section>
  );

  if (placement === "footer") {
    return <div className="profile-dashboard-footer-block">{section}</div>;
  }
  return section;
}
