import Link from "next/link";

import type { UserPropertySummary } from "@/lib/properties/get-user-properties";
import {
  propertyRoleLabel,
  propertyTypeLabel,
} from "@/lib/properties/labels";

type Props = {
  property: UserPropertySummary;
};

export function PropertyCard({ property }: Props) {
  const location =
    property.kommun?.trim() || property.city?.trim() || null;

  return (
    <article className="my-analyses-card profile-property-card">
      <h2 className="my-analyses-card-address">{property.address}</h2>
      <dl className="my-analyses-card-meta">
        <div>
          <dt>Fastighetsbeteckning</dt>
          <dd>{property.designation?.trim() || "—"}</dd>
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
      </dl>

      {property.analyses.length > 0 ? (
        <div className="profile-linked-analyses">
          <h3 className="profile-linked-heading">Kopplade analyser</h3>
          <ul className="profile-linked-list">
            {property.analyses.map((analysis) => {
              const date = new Date(analysis.created_at).toLocaleDateString(
                "sv-SE",
                { year: "numeric", month: "long", day: "numeric" },
              );
              return (
                <li key={analysis.id}>
                  <Link
                    href={`/mina-analyser/${analysis.id}`}
                    className="profile-linked-link"
                  >
                    <span>{analysis.address}</span>
                    <span className="profile-linked-date">{date}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="profile-linked-empty">Inga kopplade analyser ännu.</p>
      )}
    </article>
  );
}
