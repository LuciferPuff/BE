import { AnalyseForm } from "@/components/analyse/AnalyseForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Analysera din bostad",
  description:
    "Fyll i uppgifter om bostaden du tittar på – strukturerad analys under beta.",
  alternates: { canonical: `${base}/analys` },
  openGraph: {
    url: `${base}/analys`,
    title: "Analysera din bostad | Byggello",
    description:
      "Fyll i uppgifter om bostaden du tittar på – strukturerad analys under beta.",
  },
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// BYG-74: läs UTM på servern och skicka som prop. Undviker useSearchParams +
// Suspense i klientformuläret. Sidan blir dynamiskt renderad, vilket är OK.
export default async function AnalysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const utm = {
    utm_source: firstParam(params.utm_source),
    utm_medium: firstParam(params.utm_medium),
    utm_campaign: firstParam(params.utm_campaign),
  };

  return (
    <main className="home analyse-landing">
      <SiteHeader />
      <div className="home-container analyse-landing-inner">
        <h1 className="analyse-landing-title">Analysera din bostad</h1>
        <p className="analyse-landing-intro">
          Fyll i uppgifterna nedan så analyserar vi bostaden åt dig – helt gratis
          under beta.
        </p>
        <AnalyseForm utm={utm} />
      </div>
      <SiteFooter />
    </main>
  );
}
