import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { PropertyDashboardView } from "@/components/profil/PropertyDashboardView";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getPropertyDashboard } from "@/lib/properties/get-property-dashboard";
import { isPropertyPartKey } from "@/lib/properties/parts-catalog";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ del?: string }>;
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

export default async function PropertyDashboardPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { del } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/logga-in?next=/profil/${id}`);
  }

  const property = await getPropertyDashboard(id, user.id);
  if (!property) {
    notFound();
  }

  const openPartKey =
    del && isPropertyPartKey(del) ? del : null;

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section className="my-analyses-hero my-analyses-hero--nav-only" aria-labelledby="dashboard-nav">
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav" id="dashboard-nav">
            <Link href="/profil" className="my-analyses-back">
              ← Mina hus
            </Link>
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content profile-dashboard-content">
        <PropertyDashboardView
          property={property}
          openPartKey={openPartKey}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
