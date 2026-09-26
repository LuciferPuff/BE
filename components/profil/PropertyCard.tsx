import Link from "next/link";

import type { UserPropertySummary } from "@/lib/properties/get-user-properties";
import {
  ownershipStatusLabel,
  propertyRoleLabel,
  propertyTypeLabel,
} from "@/lib/properties/labels";

type Props = {
  property: UserPropertySummary;
};

export function PropertyCard({ property }: Props) {
  const location =
    property.kommun?.trim() || property.city?.trim() || null;
  const analysisCount = property.analyses.length;

  return (
    <article className="my-analyses-card profile-property-card">
      <Link
        href={`/profil/${property.id}`}
        className="profile-property-card-link"
      >
        <h2 className="my-analyses-card-address">{property.address}</h2>
        <dl className="my-analyses-card-meta">
          <div>
            <dt>Status</dt>
            <dd>{ownershipStatusLabel(property.ownership_status)}</dd>
          </div>
          <div>
            <dt>Byggår</dt>
            <dd>
              {property.construction_year != null
                ? property.construction_year
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Kommun</dt>
            <dd>{location ?? "—"}</dd>
          </div>
          <div>
            <dt>Typ</dt>
            <dd>{propertyTypeLabel(property.property_type)}</dd>
          </div>
          <div>
            <dt>Din roll</dt>
            <dd>{propertyRoleLabel(property.role)}</dd>
          </div>
          <div>
            <dt>Analyser</dt>
            <dd>
              {analysisCount === 0
                ? "Inga ännu"
                : `${analysisCount} kopplad${analysisCount === 1 ? "" : "e"}`}
            </dd>
          </div>
        </dl>
        <p className="profile-card-open">Öppna huset →</p>
      </Link>

      {property.role === "agare" ? (
        <p className="profile-card-actions">
          <Link
            href={`/profil/${property.id}/redigera`}
            className="profile-edit-link"
          >
            Redigera
          </Link>
        </p>
      ) : null}
    </article>
  );
}
