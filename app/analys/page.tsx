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

export default function AnalysPage() {
  return (
    <main className="home analyse-landing">
      <SiteHeader />
      <div className="home-container analyse-landing-inner">
        <h1 className="analyse-landing-title">Analysera din bostad</h1>
        <p className="analyse-landing-intro">
          Fyll i uppgifterna nedan så analyserar vi bostaden åt dig – helt gratis
          under beta.
        </p>
        <AnalyseForm />
      </div>
      <SiteFooter />
    </main>
  );
}
