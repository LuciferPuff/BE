import { ArticlePortableText } from "@/components/article/ArticlePortableText";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import { buildArticleDescription, getPostBySlug } from "@/lib/sanity/posts";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: "Artikel hittades inte" };
  }

  const base = getSiteUrl();
  const canonical = `${base}/artiklar/${slug}`;
  const title = (post.seoTitle?.trim() || post.title).slice(0, 70);
  // `description` (+ ev. äldre `seoDescription`) hämtas i getPostBySlug; annars generisk fallback.
  const description = buildArticleDescription(post);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post._updatedAt,
      locale: "sv_SE",
      siteName: "Byggello",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ArtikelPage({ params }: Props) {
  const { slug } = await params;
  const artikel = await getPostBySlug(slug);

  if (!artikel) return notFound();

  const base = getSiteUrl();
  const canonicalUrl = `${base}/artiklar/${slug}`;

  return (
    <main className="article-page">
      <ArticleJsonLd post={artikel} canonicalUrl={canonicalUrl} />
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/artiklar">← Alla artiklar</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">{artikel.title}</h1>
        {artikel.publishedAt && (
          <p className="article-meta">
            <time dateTime={new Date(artikel.publishedAt).toISOString()}>
              {new Date(artikel.publishedAt).toLocaleDateString("sv-SE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </p>
        )}
        {artikel.body && (
          <div className="article-body">
            <ArticlePortableText value={artikel.body} />
          </div>
        )}
      </article>
    </main>
  );
}
