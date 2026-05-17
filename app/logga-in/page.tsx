import { MagicLinkForm } from "@/components/auth/MagicLinkForm";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Logga in",
  description:
    "Logga in på Byggello med en magisk länk skickad till din e-post – inget lösenord behövs.",
  alternates: { canonical: `${base}/logga-in` },
  openGraph: {
    url: `${base}/logga-in`,
    title: "Logga in | Byggello",
    description:
      "Få en inloggningslänk via e-post och fortsätt till din bostadsanalys.",
  },
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function LoggaInPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const rawError = Array.isArray(error) ? error[0] : error;
  const authError = rawError === "auth";

  return (
    <main className="home auth-landing">
      <SiteHeader />
      <section className="auth-hero" aria-labelledby="auth-hero-heading">
        <div className="home-container auth-hero-inner">
          <h1 id="auth-hero-heading" className="auth-hero-title">
            Logga in
          </h1>
          <p className="auth-hero-lead">
            Vi skickar en säker länk till din e-post så att du kan spara och
            hitta tillbaka till dina analyser.
          </p>
        </div>
      </section>
      <div className="home-container auth-landing-form">
        <MagicLinkForm authError={authError} />
      </div>
      <SiteFooter />
    </main>
  );
}
