import Link from "next/link";
import type { Metadata } from "next";
import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { getAllGuidesForList } from "@/lib/sanity/guides";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Guider",
  description:
    "Fristående guider och material från Byggello – fördjupning utöver våra artiklar.",
  alternates: { canonical: `${base}/guider` },
  openGraph: {
    url: `${base}/guider`,
    title: "Guider | Byggello",
    description:
      "Fristående guider och material från Byggello – fördjupning utöver våra artiklar.",
  },
};

export const revalidate = 600;

export default async function GuiderPage() {
  const guides = await getAllGuidesForList();

  return (
    <ContentPageShell
      breadcrumb={
        <ContentBreadcrumb
          items={[{ label: "Startsida", href: "/" }, { label: "Guider" }]}
        />
      }
    >
      <article className="article-card content-index-card">
        <div className="content-index-head">
          <h1 className="article-title">Guider</h1>
          <p className="article-lead">
            Fristående guider och mer omfattande material – separat från våra
            kortare <Link href="/artiklar">artiklar</Link>.
          </p>
        </div>
        {guides.length === 0 ? (
          <p className="article-body">
            Inga guider publicerade ännu. Lägg till dokumenttypen Guide i Sanity
            Studio.
          </p>
        ) : (
          <ul className="artiklar-list content-index-list">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/guider/${g.slug}`} className="artiklar-list-link">
                  <span className="artiklar-list-title">{g.title}</span>
                  {g.publishedAt && (
                    <span className="artiklar-list-date">
                      {new Date(g.publishedAt).toLocaleDateString("sv-SE")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </ContentPageShell>
  );
}
