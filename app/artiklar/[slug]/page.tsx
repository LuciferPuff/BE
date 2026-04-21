import { ArticlePortableText } from "@/components/article/ArticlePortableText";
import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import {
  buildArticleDescription,
  getAllPostSlugs,
  getPostBySlug,
  getPostCoverAlt,
} from "@/lib/sanity/posts";
import { urlForSanityImage } from "@/lib/sanity/imageUrl";
import { getSiteUrl } from "@/lib/site";
import { normalizeArticleSlugParam } from "@/lib/slug";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 600;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({
    slug: normalizeArticleSlugParam(slug),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const post = await getPostBySlug(rawSlug);
  if (!post) {
    return { title: "Artikel hittades inte" };
  }

  const base = getSiteUrl();
  const canonical = `${base}/artiklar/${post.slug}`;
  const title = (post.seoTitle?.trim() || post.title).slice(0, 70);
  // `description` (+ ev. äldre `seoDescription`) hämtas i getPostBySlug; annars generisk fallback.
  const description = buildArticleDescription(post);
  const ogImageUrl =
    post.coverImage != null ? urlForSanityImage(post.coverImage, 1200) : null;
  const ogImages =
    ogImageUrl != null
      ? [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: getPostCoverAlt(post.coverImage, title),
          },
        ]
      : undefined;

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
      ...(ogImages != null ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImageUrl != null ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function ArtikelPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const artikel = await getPostBySlug(rawSlug);

  if (!artikel) return notFound();

  const base = getSiteUrl();
  const canonicalUrl = `${base}/artiklar/${artikel.slug}`;
  const coverSrc =
    artikel.coverImage != null
      ? urlForSanityImage(artikel.coverImage, 960)
      : null;
  const coverAlt = getPostCoverAlt(artikel.coverImage, artikel.title);

  return (
    <>
      <ArticleJsonLd
        headline={artikel.seoTitle?.trim() || artikel.title}
        description={buildArticleDescription(artikel)}
        datePublished={artikel.publishedAt}
        dateModified={artikel._updatedAt}
        canonicalUrl={canonicalUrl}
      />
      <ContentPageShell
        kindLabel="Artikel"
        breadcrumb={
          <ContentBreadcrumb
            items={[
              { label: "Startsida", href: "/" },
              { label: "Artiklar", href: "/artiklar" },
              { label: artikel.title },
            ]}
          />
        }
      >
        <div className="content-article-column">
          <article className="article-card content-article-card">
            <div className="content-article-head">
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
            </div>
            {coverSrc != null && (
              <figure className="article-cover">
                <Image
                  src={coverSrc}
                  alt={coverAlt}
                  width={960}
                  height={540}
                  sizes="(max-width: 768px) 100vw, 700px"
                  className="article-cover-image"
                  priority
                />
              </figure>
            )}
            {artikel.body && (
              <div className="article-body">
                <ArticlePortableText value={artikel.body} />
              </div>
            )}
          </article>
        </div>
      </ContentPageShell>
    </>
  );
}
