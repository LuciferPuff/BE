import { EarlyAccessEmailForm } from "@/components/registrera/EarlyAccessEmailForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Nyhetsbrev",
  description:
    "Få tips och nyheter från Byggello om tryggare bostadsköp och fastighetsprofil.",
  alternates: { canonical: `${base}/registrera` },
  openGraph: {
    url: `${base}/registrera`,
    title: "Nyhetsbrev | Byggello",
    description:
      "Få tips och nyheter från Byggello om tryggare bostadsköp och fastighetsprofil.",
  },
};

export default function RegistreraPage() {
  return (
    <main className="home analyse-landing">
      <SiteHeader />
      <div className="home-container analyse-landing-inner">
        <h1 className="analyse-landing-title">Få tips från Byggello</h1>
        <p className="analyse-landing-intro">
          Vill du ha nyheter och tips om bostadsköp och underhåll? Anmäl dig
          här. Redan redo att komma igång?{" "}
          <Link href="/logga-in?next=/profil">Skapa din fastighetsprofil</Link>{" "}
          eller{" "}
          <Link href="/analys">starta en analys</Link>.
        </p>
        <EarlyAccessEmailForm />
      </div>
      <SiteFooter />
    </main>
  );
}
