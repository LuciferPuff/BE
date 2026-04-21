import Link from "next/link";
import type { Metadata } from "next";
import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { getSanityClient } from "@/lib/sanity/client";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();

export const metadata: Metadata = {
  title: "Artiklar",
  description:
    "Artiklar för dig som ska köpa bostad – analys, visning och köpprocessen.",
  alternates: { canonical: `${base}/artiklar` },
  openGraph: {
    url: `${base}/artiklar`,
    title: "Artiklar | Byggello",
    description:
      "Artiklar för dig som ska köpa bostad – analys, visning och köpprocessen.",
  },
};

export const revalidate = 600;

export default async function ArtiklarIndexPage() {
  const client = getSanityClient();
  let posts: { title: string; slug: string; publishedAt: string | null }[] = [];
  if (client) {
    try {
      posts =
        (await client.fetch<
          { title: string; slug: string; publishedAt: string | null }[]
        >(
          `*[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _updatedAt) desc) {
            title,
            "slug": slug.current,
            publishedAt
          }`
        )) ?? [];
    } catch {
      posts = [];
    }
  }

  return (
    <ContentPageShell
      breadcrumb={
        <ContentBreadcrumb
          items={[{ label: "Startsida", href: "/" }, { label: "Artiklar" }]}
        />
      }
    >
      <article className="article-card content-index-card">
        <div className="content-index-head">
          <h1 className="article-title">Artiklar</h1>
          <p className="article-lead">
            Kunskap för husköpare – från första visning till kontrakt.
          </p>
        </div>
        {posts.length === 0 ? (
          <p className="article-body">
            Inga artiklar ännu. Publicera i Sanity Studio.
          </p>
        ) : (
          <ul className="artiklar-list content-index-list">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/artiklar/${p.slug}`} className="artiklar-list-link">
                  <span className="artiklar-list-title">{p.title}</span>
                  {p.publishedAt && (
                    <span className="artiklar-list-date">
                      {new Date(p.publishedAt).toLocaleDateString("sv-SE")}
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
