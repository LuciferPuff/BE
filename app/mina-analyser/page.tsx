import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { AnalysisCard } from "@/components/mina-analyser/AnalysisCard";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getUserAnalyses } from "@/lib/analyses/get-user-analyses";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Mina analyser",
  description: "Dina sparade bostadsanalyser på Byggello.",
  alternates: { canonical: `${base}/mina-analyser` },
  robots: { index: false, follow: false },
};

export default async function MinaAnalyserPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/mina-analyser");
  }

  const analyses = await getUserAnalyses(user.id);

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero" aria-labelledby="my-analyses-heading">
        <div className="home-container my-analyses-hero-inner">
          <h1 id="my-analyses-heading" className="my-analyses-title">
            Mina analyser
          </h1>
          <p className="my-analyses-intro">
            Här sparas analyser du kör när du är inloggad.
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content">
        {analyses.length === 0 ? (
          <div className="my-analyses-empty">
            <p>
              Du har inga analyser ännu. Analyser du kör när du är inloggad
              sparas här automatiskt.
            </p>
            <Link href="/analys" className="home-btn home-btn-primary">
              Starta analys
            </Link>
          </div>
        ) : (
          <ul className="my-analyses-list">
            {analyses.map((analysis) => (
              <li key={analysis.id}>
                <AnalysisCard analysis={analysis} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
