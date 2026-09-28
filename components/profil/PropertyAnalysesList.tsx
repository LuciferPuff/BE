"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { loadMoreAnalysesAction } from "@/app/profil/actions";
import { ShowMoreButton } from "@/components/profil/ShowMoreButton";
import { UnlinkAnalysisButton } from "@/components/mina-analyser/UnlinkAnalysisButton";
import type { DashboardLinkedAnalysis } from "@/lib/properties/get-property-dashboard";

type Props = {
  propertyId: string;
  initialAnalyses: DashboardLinkedAnalysis[];
  initialHasMore: boolean;
  canUnlink: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PropertyAnalysesList({
  propertyId,
  initialAnalyses,
  initialHasMore,
  canUnlink,
}: Props) {
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const result = await loadMoreAnalysesAction(propertyId, analyses.length);
      if (result.error || !result.items) return;
      setAnalyses((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...result.items!.filter((a) => !seen.has(a.id))];
      });
      setHasMore(Boolean(result.hasMore));
    });
  }

  if (analyses.length === 0) {
    return (
      <div className="profile-dashboard-empty">
        <p>Inga kopplade analyser ännu.</p>
        <Link href="/analys" className="profile-edit-link">
          Analysera det här huset
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="profile-linked-list">
        {analyses.map((analysis) => (
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
            {canUnlink ? (
              <UnlinkAnalysisButton
                analysisId={analysis.id}
                returnTo="profil"
                variant="inline"
              />
            ) : null}
          </li>
        ))}
      </ul>
      {hasMore ? (
        <ShowMoreButton onClick={loadMore} pending={pending} />
      ) : null}
    </>
  );
}
