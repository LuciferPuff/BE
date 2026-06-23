import Link from "next/link";
import type { Metadata } from "next";

import { MetaViewContentTracker } from "@/components/MetaViewContentTracker";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getSiteUrl } from "@/lib/site";
import { buildAnalysHref } from "@/lib/utm";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Vet du vad du ska kolla innan du köper huset?",
  description:
    "Innan du lägger bud — få de frågor om huset du inte visste att du skulle ställa.",
  alternates: { canonical: `${base}/lp/husanalys` },
  openGraph: {
    url: `${base}/lp/husanalys`,
    title: "Vet du vad du ska kolla innan du köper huset? | Byggello",
    description:
      "Innan du lägger bud — få de frågor om huset du inte visste att du skulle ställa.",
  },
  robots: { index: false, follow: true },
};

const VALUE_BLOCKS = [
  {
    title: "Vi läser annonsen som en fastighetsingenjör",
    text: "Ett hus från 60-talet kan ha blåbetong i väggarna. Ett från 80-talet kan ha trägolv som suger fukt från betongen. Sånt syns inte på bilderna — men vi ser det i annonsen, och berättar vad det betyder för dig.",
  },
  {
    title: "Stå aldrig svarslös på en visning igen",
    text: "Du får en färdig lista med rätt frågor att ställa om just det här huset — när dräneringen byttes, om radon är mätt, hur gammalt taket är. Frågorna som avgör om huset är värt sitt pris.",
  },
  {
    title: "Se vad som tickar — innan det smäller",
    text: "Tak, dränering, värmepump, tätskikt. Allt har en livslängd, och i ett begagnat hus är frågan inte om utan när. Vi visar vad som närmar sig slutet — och ungefär vad det kostar att åtgärda.",
  },
] as const;

function LpCta({
  href,
  id,
}: {
  href: string;
  id?: string;
}) {
  return (
    <div className="lp-husanalys-cta">
      <Link
        id={id}
        href={href}
        className="home-btn home-btn-primary lp-husanalys-cta-btn"
      >
        Klistra in annonsen — få din genomgång
      </Link>
      <p className="lp-husanalys-cta-hint">
        Kopiera texten från bostadsannonsen och klistra in. Ju mer du tar med,
        desto mer hittar vi. Gratis.
      </p>
    </div>
  );
}

export default async function HusanalysLpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const analysHref = buildAnalysHref(params);

  return (
    <main className="home lp-husanalys">
      <MetaViewContentTracker />
      <SiteHeader />

      <section className="home-hero" aria-labelledby="lp-husanalys-hero-heading">
        <div className="home-hero-inner">
          <h1 id="lp-husanalys-hero-heading" className="home-hero-title">
            Vet du vad du ska kolla innan du köper huset?
          </h1>
          <p className="home-hero-lead">
            Innan du lägger bud — få de frågor om huset du inte visste att du
            skulle ställa.
          </p>
          <div className="home-hero-actions">
            <LpCta href={analysHref} id="lp-husanalys-hero-cta" />
          </div>
        </div>
      </section>

      <section
        className="home-section"
        aria-labelledby="lp-husanalys-value-heading"
      >
        <div className="home-container">
          <h2 id="lp-husanalys-value-heading" className="visually-hidden">
            Så hjälper Byggello dig
          </h2>
          <div className="home-value-grid">
            {VALUE_BLOCKS.map((block) => (
              <div key={block.title} className="home-value-card">
                <h3 className="home-value-title">{block.title}</h3>
                <p className="home-value-text">{block.text}</p>
              </div>
            ))}
          </div>
          <p className="lp-husanalys-disclaimer">
            Kostnaderna är uppskattningar baserade på Byggellos schablonvärden
            och den indata du angett.
          </p>
        </div>
      </section>

      <section
        className="home-section home-section-alt lp-husanalys-closing"
        aria-labelledby="lp-husanalys-closing-heading"
      >
        <div className="home-container lp-husanalys-closing-inner">
          <h2 id="lp-husanalys-closing-heading" className="visually-hidden">
            Starta din genomgång
          </h2>
          <LpCta href={analysHref} />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
