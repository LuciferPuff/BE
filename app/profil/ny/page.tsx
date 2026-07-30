import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { CreatePropertyForm } from "@/components/profil/CreatePropertyForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Skapa fastighet",
  description: "Lägg till en fastighet i din Byggello-profil.",
  alternates: { canonical: `${base}/profil/ny` },
  robots: { index: false, follow: false },
};

export default async function NyFastighetPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/profil/ny");
  }

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero" aria-labelledby="ny-fastighet-heading">
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav">
            <Link href="/profil" className="my-analyses-back">
              ← Tillbaka till profil
            </Link>
          </p>
          <h1 id="ny-fastighet-heading" className="my-analyses-title">
            Skapa fastighet
          </h1>
          <p className="my-analyses-intro">
            Du blir ägare till fastigheten. Du kan komplettera mer data senare.
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content">
        <div className="profile-form-panel">
          <CreatePropertyForm />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
