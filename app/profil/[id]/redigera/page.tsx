import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { EditPropertyForm } from "@/components/profil/EditPropertyForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getPropertyForEdit } from "@/lib/properties/get-property-for-edit";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Redigera fastighet",
    description: "Uppdatera uppgifter om din fastighet.",
    alternates: { canonical: `${base}/profil/${id}/redigera` },
    robots: { index: false, follow: false },
  };
}

export default async function RedigeraFastighetPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/logga-in?next=/profil/${id}/redigera`);
  }

  const property = await getPropertyForEdit(id, user.id);
  if (!property) {
    notFound();
  }

  if (property.role !== "agare") {
    redirect("/profil");
  }

  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section
        className="my-analyses-hero"
        aria-labelledby="redigera-fastighet-heading"
      >
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav">
            <Link href="/profil" className="my-analyses-back">
              ← Tillbaka till profil
            </Link>
          </p>
          <h1 id="redigera-fastighet-heading" className="my-analyses-title">
            Redigera fastighet
          </h1>
          <p className="my-analyses-intro">{property.address}</p>
        </div>
      </section>
      <div className="home-container my-analyses-content">
        <div className="profile-form-panel">
          <EditPropertyForm property={property} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
