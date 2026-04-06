import { getSanityClient } from "@/lib/sanity/client";
import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArtikelPage({ params }: Props) {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) return notFound();

  const artikel = await client.fetch(
    `*[_type == "post" && slug.current == $slug][0]{
      title,
      publishedAt,
      body
    }`,
    { slug }
  );

  if (!artikel) return notFound();

  return (
    <main className="article-page">
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/">← Till startsidan</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">{artikel.title}</h1>
        {artikel.publishedAt && (
          <p className="article-meta">
            {new Date(artikel.publishedAt).toLocaleDateString("sv-SE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
        {artikel.body && (
          <div className="article-body">
            <PortableText value={artikel.body} />
          </div>
        )}
      </article>
    </main>
  );
}