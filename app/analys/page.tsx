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
    <main className="article-page">
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/">← Till startsidan</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">Starta analys</h1>
        <p className="article-lead">
          Här kopplar du snart ihop ditt riktiga analysflöde (inloggning, betalning
          eller liknande).
        </p>
        <div className="article-body">
          <p>
            Under tiden kan du läsa våra{" "}
            <Link href="/artiklar">guider för husköpare</Link> eller gå tillbaka
            till <Link href="/">startsidan</Link>.
          </p>
        </div>
      </article>
    </main>
  );
}
