import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { AnalysisResultView } from "@/components/analyse/AnalysisResultView";
import { LinkToPropertyForm } from "@/components/mina-analyser/LinkToPropertyForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getUserAnalysis } from "@/lib/analyses/get-user-analysis";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getUserProperties } from "@/lib/properties/get-user-properties";
import { getSiteUrl } from "@/lib/site";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base = getSiteUrl();
  return {
    title: "Analys",
    alternates: { canonical: `${base}/mina-analyser/${id}` },
    robots: { index: false, follow: false },
  };
}

export default async function MinaAnalyserDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) {
    const { id } = await params;
    redirect(`/logga-in?next=/mina-analyser/${encodeURIComponent(id)}`);
  }

  const { id } = await params;
  const analysis = await getUserAnalysis(user.id, id);
  if (!analysis) {
    notFound();
  }

  const date = new Date(analysis.created_at).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const properties = analysis.linked_property_id
    ? []
    : (await getUserProperties(user.id)).filter((p) => p.role === "agare");

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero" aria-labelledby="my-analysis-heading">
        <div className="home-container my-analyses-hero-inner">
          <Link href="/mina-analyser" className="my-analyses-back">
            ← Mina analyser
          </Link>
          <h1 id="my-analysis-heading" className="my-analyses-title">
            {analysis.address}
          </h1>
          <dl className="my-analyses-detail-meta">
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
        </div>
      </section>
      <div className="home-container my-analyses-detail-content">
        {analysis.linked_property_id ? (
          <p className="link-analysis-linked">
            Kopplad till en fastighet i din profil.{" "}
            <Link href="/profil">Visa profil →</Link>
          </p>
        ) : (
          <LinkToPropertyForm
            analysisId={analysis.id}
            defaultAddress={analysis.address}
            properties={properties.map((p) => ({
              id: p.id,
              address: p.address,
              designation: p.designation,
            }))}
          />
        )}

        <AnalysisResultView
          analysis={analysis.result}
          analysisId={analysis.id}
          metaLabel={`Analys från ${date}.`}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
