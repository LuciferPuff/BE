import Link from "next/link";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminStats } from "@/lib/stats/get-admin-stats";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Admin",
  description: "Intern överblick över Byggello.",
  alternates: { canonical: `${base}/admin` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatNumber(n: number): string {
  return n.toLocaleString("sv-SE");
}

function formatFetchedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("sv-SE", {
      timeZone: "Europe/Stockholm",
    });
  } catch {
    return iso;
  }
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="admin-metric">
      <p className="admin-metric-label">{label}</p>
      <p className="admin-metric-value">{value}</p>
      {hint ? <p className="admin-metric-hint">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const profile = await requireAdmin();
  const stats = await getAdminStats();

  return (
    <main className="home admin-page">
      <SiteHeader />
      <section className="admin-hero" aria-labelledby="admin-heading">
        <div className="home-container admin-hero-inner">
          <p className="profile-account-nav">
            <Link href="/profil" className="my-analyses-back">
              Min profil
            </Link>
          </p>
          <h1 id="admin-heading" className="admin-title">
            Byggello-status
          </h1>
          <p className="admin-intro">
            Intern överblick för {profile.email ?? "admin"}. Bara aggregat – ingen
            användardata i klartext.
          </p>
        </div>
      </section>

      <div className="home-container admin-content">
        {!stats ? (
          <p className="admin-error" role="alert">
            Kunde inte hämta statistik. Kontrollera att migreringen
            get_admin_dashboard_stats är körd.
          </p>
        ) : (
          <>
            <p className="admin-fetched">
              Uppdaterad {formatFetchedAt(stats.fetchedAt)}
            </p>

            <section className="admin-section" aria-labelledby="admin-accounts">
              <h2 id="admin-accounts" className="admin-section-title">
                Konton
              </h2>
              <div className="admin-metric-grid">
                <MetricCard
                  label="Registrerade konton"
                  value={formatNumber(stats.profilesTotal)}
                />
                <MetricCard
                  label="Nya senaste 7 dagarna"
                  value={formatNumber(stats.profilesLast7Days)}
                />
                <MetricCard
                  label="Nya senaste 30 dagarna"
                  value={formatNumber(stats.profilesLast30Days)}
                />
                <MetricCard
                  label="Nyhetsbrev"
                  value={formatNumber(stats.subscribersTotal)}
                />
              </div>
            </section>

            <section className="admin-section" aria-labelledby="admin-props">
              <h2 id="admin-props" className="admin-section-title">
                Fastighetsprofiler
              </h2>
              <div className="admin-metric-grid">
                <MetricCard
                  label="Profiler (adresser)"
                  value={formatNumber(stats.propertiesTotal)}
                />
                <MetricCard
                  label="Nya senaste 7 dagarna"
                  value={formatNumber(stats.propertiesLast7Days)}
                />
                <MetricCard
                  label="Nya senaste 30 dagarna"
                  value={formatNumber(stats.propertiesLast30Days)}
                />
                <MetricCard
                  label="Delade (fler än en person)"
                  value={formatNumber(stats.propertiesShared)}
                />
              </div>
            </section>

            <section className="admin-section" aria-labelledby="admin-analyses">
              <h2 id="admin-analyses" className="admin-section-title">
                Analyser
              </h2>
              <div className="admin-metric-grid">
                <MetricCard
                  label="Körningar totalt"
                  value={formatNumber(stats.analysisRunsTotal)}
                  hint="user_analyses"
                />
                <MetricCard
                  label="Körningar senaste 7 dagarna"
                  value={formatNumber(stats.analysisRunsLast7Days)}
                />
                <MetricCard
                  label="Unika AI-resultat (cache)"
                  value={formatNumber(stats.analysisCacheTotal)}
                  hint="analysis_results"
                />
              </div>
            </section>

            <section
              className="admin-section"
              aria-labelledby="admin-engagement"
            >
              <h2 id="admin-engagement" className="admin-section-title">
                Engagemang på profil
              </h2>
              <div className="admin-metric-grid">
                <MetricCard
                  label="Med verifierad husdel"
                  value={formatNumber(stats.propertiesWithVerifiedParts)}
                  hint="Minst en del med bytessår"
                />
                <MetricCard
                  label="Med dokument"
                  value={formatNumber(stats.propertiesWithDocuments)}
                />
                <MetricCard
                  label="Med länkad analys"
                  value={formatNumber(stats.propertiesWithLinkedAnalysis)}
                />
              </div>
            </section>

            <section className="admin-section" aria-labelledby="admin-interest">
              <h2 id="admin-interest" className="admin-section-title">
                Intresse (Meddela mig)
              </h2>
              {stats.featureInterest.length === 0 ? (
                <p className="admin-empty">Ingen har anmält intresse ännu.</p>
              ) : (
                <ul className="admin-interest-list">
                  {stats.featureInterest.map((row) => (
                    <li key={row.feature} className="admin-interest-item">
                      <span>{row.feature}</span>
                      <strong>{formatNumber(row.count)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-section" aria-labelledby="admin-traffic">
              <h2 id="admin-traffic" className="admin-section-title">
                Trafik / besök
              </h2>
              <p className="admin-empty">
                Sidvisningar samlas via Vercel Analytics. Öppna{" "}
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-edit-link"
                >
                  Vercel Dashboard → Analytics
                </a>{" "}
                för besökare, sidvisningar och toppsidor.
              </p>
            </section>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
