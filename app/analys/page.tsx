import Link from "next/link";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Starta analys",
  description:
    "Kom igång med strukturerad bostadsanalys – tydliga insikter och rapport online.",
  alternates: { canonical: `${base}/analys` },
  openGraph: {
    url: `${base}/analys`,
    title: "Starta analys | Byggello",
    description:
      "Kom igång med strukturerad bostadsanalys – tydliga insikter och rapport online.",
  },
};

export default function AnalysPage() {
  return (
    <main className="article-page analysis-page">
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/">← Till startsidan</Link>
      </nav>
      <article className="article-card analysis-card">
        <div className="analysis-card-head">
          <h1 className="article-title">Starta analys</h1>
          <p className="article-lead analysis-lead">
            Här kommer snart vårt analysverktyg som ska hjälpa dig att göra en
            tryggare bostadsaffär!
          </p>
        </div>
        <div className="article-body">
          <p>
            Under tiden kan du läsa våra <Link href="/artiklar">artiklar</Link> och{" "}
            <Link href="/guider">guider för husköpare</Link> eller gå tillbaka till{" "}
            <Link href="/">startsidan</Link>. :)
          </p>
          <div className="analysis-actions" aria-label="Snabbval">
            <Link href="/artiklar" className="analysis-action-link">
              Läs artiklar
            </Link>
            <Link href="/guider" className="analysis-action-link">
              Läs guider
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
