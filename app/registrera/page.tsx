import { EarlyAccessEmailForm } from "@/components/registrera/EarlyAccessEmailForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Registrera",
  description:
    "Anmäl ditt intresse för fastighetsprofilen och Byggello – vi hör av oss när inloggning finns.",
  alternates: { canonical: `${base}/registrera` },
  openGraph: {
    url: `${base}/registrera`,
    title: "Registrera | Byggello",
    description:
      "Håll dig uppdaterad när fastighetsprofilen och inloggning lanseras.",
  },
};

export default function RegistreraPage() {
  return (
    <main className="home analyse-landing">
      <SiteHeader />
      <div className="home-container analyse-landing-inner">
        <h1 className="analyse-landing-title">Registrera ditt intresse</h1>
        <p className="analyse-landing-intro">
          Håll dig uppdaterad om när vi har skapat fastighetsprofilen och
          inloggningen. Anslut dig tidigt till vår plattform och ta emot
          exklusiva erbjudanden längs vägen.
        </p>
        <EarlyAccessEmailForm />
      </div>
      <SiteFooter />
    </main>
  );
}
