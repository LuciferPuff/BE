import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { PropertyDashboardView } from "@/components/profil/PropertyDashboardView";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getPropertyDashboard } from "@/lib/properties/get-property-dashboard";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Fastighet",
    description: "Din fastighetsprofil på Byggello.",
    alternates: { canonical: `${base}/profil/${id}` },
    robots: { index: false, follow: false },
  };
}

export default async function PropertyDashboardPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/logga-in?next=/profil/${id}`);
  }

  const property = await getPropertyDashboard(id, user.id);
  if (!property) {
    notFound();
  }

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero" aria-labelledby="dashboard-nav">
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav" id="dashboard-nav">
            <Link href="/profil" className="my-analyses-back">
              ← Mina hus
            </Link>
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content">
        <PropertyDashboardView property={property} />
      </div>
      <SiteFooter />
    </main>
  );
}
