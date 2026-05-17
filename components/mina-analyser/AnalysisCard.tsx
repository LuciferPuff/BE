import type { UserAnalysisSummary } from "@/lib/analyses/get-user-analyses";

type Props = {
  analysis: UserAnalysisSummary;
};

export function AnalysisCard({ analysis }: Props) {
  const date = new Date(analysis.created_at).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="my-analyses-card">
      <h2 className="my-analyses-card-address">{analysis.address}</h2>
      <dl className="my-analyses-card-meta">
        <div>
          <dt>Datum</dt>
          <dd>{date}</dd>
        </div>
        <div>
          <dt>Objekttyp</dt>
          <dd>{analysis.object_type}</dd>
        </div>
        <div>
          <dt>Byggnadsår</dt>
          <dd>{analysis.build_year}</dd>
        </div>
      </dl>
    </article>
  );
}
