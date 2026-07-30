import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PropertyCard } from "@/components/profil/PropertyCard";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getUserProperties } from "@/lib/properties/get-user-properties";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Min profil",
  description: "Dina fastigheter på Byggello.",
  alternates: { canonical: `${base}/profil` },
  robots: { index: false, follow: false },
};

export default async function ProfilPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/profil");
  }

  const properties = await getUserProperties(user.id);

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero" aria-labelledby="profil-heading">
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav">
            <Link href="/mina-analyser" className="my-analyses-back">
              Mina analyser
            </Link>
          </p>
          <h1 id="profil-heading" className="my-analyses-title">
            Min profil
          </h1>
          <p className="my-analyses-intro">
            Här samlar du dina fastigheter och kopplade analyser.
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content">
        {properties.length === 0 ? (
          <div className="my-analyses-empty">
            <p>
              Du har inga fastigheter ännu. Skapa din första för att börja
              bygga upp din fastighetsprofil.
            </p>
            <Link href="/profil/ny" className="home-btn home-btn-primary">
              Skapa fastighet
            </Link>
          </div>
        ) : (
          <>
            <div className="profile-toolbar">
              <Link href="/profil/ny" className="home-btn home-btn-primary">
                Lägg till fastighet
              </Link>
            </div>
            <ul className="my-analyses-list">
              {properties.map((property) => (
                <li key={property.id}>
                  <PropertyCard property={property} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
