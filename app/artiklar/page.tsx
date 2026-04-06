import Link from "next/link";
import { getSanityClient } from "@/lib/sanity/client";

export const metadata = {
  title: "Guider & artiklar | Byggello",
  description: "Guider och artiklar för dig som ska köpa bostad.",
};

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
    <main className="article-page">
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/">← Till startsidan</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">Guider &amp; artiklar</h1>
        <p className="article-lead">
          Kunskap för husköpare – från första visning till kontrakt.
        </p>
        {posts.length === 0 ? (
          <p className="article-body">Inga artiklar ännu. Publicera i Sanity Studio.</p>
        ) : (
          <ul className="artiklar-list">
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
    </main>
  );
}
