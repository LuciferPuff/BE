import {
  buildArticleDescription,
  type PostForSeo,
} from "@/lib/sanity/posts";
import { getSiteUrl } from "@/lib/site";

export function ArticleJsonLd({
  post,
  canonicalUrl,
}: {
  post: PostForSeo;
  canonicalUrl: string;
}) {
  const site = getSiteUrl();
  const description = buildArticleDescription(post);
  const headline = (post.seoTitle?.trim() || post.title).slice(0, 110);

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post._updatedAt,
    author: {
      "@type": "Organization",
      name: "Byggello",
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: "Byggello",
      url: site,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    inLanguage: "sv-SE",
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
