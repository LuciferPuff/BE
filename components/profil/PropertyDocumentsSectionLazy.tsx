"use client";

import dynamic from "next/dynamic";
import type { DashboardDocument } from "@/lib/properties/get-property-dashboard";

const PropertyDocumentsSection = dynamic(
  () =>
    import("@/components/profil/PropertyDocumentsSection").then(
      (m) => m.PropertyDocumentsSection,
    ),
  {
    loading: () => (
      <div
        className="profile-dashboard-panel profile-panel-skeleton"
        aria-busy="true"
        aria-label="Laddar dokument"
      >
        <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title" />
        <div className="profile-panel-skeleton-line" />
      </div>
    ),
    ssr: true,
  },
);

type Props = {
  propertyId: string;
  documents: DashboardDocument[];
  documentsHasMore: boolean;
  folderCounts: Record<string, number>;
  canEdit: boolean;
  canDelete: boolean;
};

export function PropertyDocumentsSectionLazy(props: Props) {
  return <PropertyDocumentsSection {...props} />;
}
