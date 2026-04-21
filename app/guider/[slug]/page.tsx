import { ArticlePortableText } from "@/components/article/ArticlePortableText";
import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd";
import {
  buildGuideMetaDescription,
  getAllGuideSlugs,
  getGuideBySlug,
} from "@/lib/sanity/guides";
import { urlForSanityImage } from "@/lib/sanity/imageUrl";
import { getPostCoverAlt } from "@/lib/sanity/posts";
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
  const ogImageUrl =
    guide.coverImage != null ? urlForSanityImage(guide.coverImage, 1200) : null;
  const ogImages =
    ogImageUrl != null
      ? [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: getPostCoverAlt(guide.coverImage, title),
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
      publishedTime: guide.publishedAt ?? undefined,
      modifiedTime: guide._updatedAt,
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

export default async function GuidePage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const guide = await getGuideBySlug(rawSlug);

  if (!guide) return notFound();

  const base = getSiteUrl();
  const canonicalUrl = `${base}/guider/${guide.slug}`;
  const coverSrc =
    guide.coverImage != null ? urlForSanityImage(guide.coverImage, 960) : null;
  const coverAlt = getPostCoverAlt(guide.coverImage, guide.title);

  return (
    <>
      <ArticleJsonLd
        headline={guide.seoTitle?.trim() || guide.title}
        description={buildGuideMetaDescription(guide)}
        datePublished={guide.publishedAt}
        dateModified={guide._updatedAt}
        canonicalUrl={canonicalUrl}
      />
      <ContentPageShell
        kindLabel="Guide"
        breadcrumb={
          <ContentBreadcrumb
            items={[
              { label: "Startsida", href: "/" },
              { label: "Guider", href: "/guider" },
              { label: guide.title },
            ]}
          />
        }
      >
        <div className="content-article-column">
          <article className="article-card content-article-card">
            <div className="content-article-head">
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
                />
              </figure>
            )}
            {guide.body && (
              <div className="article-body">
                <ArticlePortableText value={guide.body} />
              </div>
            )}
          </article>
        </div>
      </ContentPageShell>
    </>
  );
}
