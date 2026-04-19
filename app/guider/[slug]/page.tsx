import { ArticlePortableText } from "@/components/article/ArticlePortableText";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import {
  buildGuideMetaDescription,
  getAllGuideSlugs,
  getGuideBySlug,
} from "@/lib/sanity/guides";
import { getSiteUrl } from "@/lib/site";
import { normalizeArticleSlugParam } from "@/lib/slug";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateStaticParams() {
  const slugs = await getAllGuideSlugs();
  return slugs.map((slug) => ({
    slug: normalizeArticleSlugParam(slug),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const guide = await getGuideBySlug(rawSlug);
  if (!guide) {
    return { title: "Guide hittades inte" };
  }

  const base = getSiteUrl();
  const canonical = `${base}/guider/${guide.slug}`;
  const title = (guide.seoTitle?.trim() || guide.title).slice(0, 70);
  const description = buildGuideMetaDescription(guide);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      publishedTime: guide.publishedAt ?? undefined,
      modifiedTime: guide._updatedAt,
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

export default async function GuidePage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const guide = await getGuideBySlug(rawSlug);

  if (!guide) return notFound();

  const base = getSiteUrl();
  const canonicalUrl = `${base}/guider/${guide.slug}`;

  return (
    <main className="article-page">
      <ArticleJsonLd
        headline={guide.seoTitle?.trim() || guide.title}
        description={buildGuideMetaDescription(guide)}
        datePublished={guide.publishedAt}
        dateModified={guide._updatedAt}
        canonicalUrl={canonicalUrl}
      />
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/guider">← Alla guider</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">{guide.title}</h1>
        {guide.publishedAt && (
          <p className="article-meta">
            <time dateTime={new Date(guide.publishedAt).toISOString()}>
              {new Date(guide.publishedAt).toLocaleDateString("sv-SE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </p>
        )}
        {guide.body && (
          <div className="article-body">
            <ArticlePortableText value={guide.body} />
          </div>
        )}
      </article>
    </main>
  );
}
