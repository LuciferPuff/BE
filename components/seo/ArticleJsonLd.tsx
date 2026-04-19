import { getSiteUrl } from "@/lib/site";

export function ArticleJsonLd({
  headline,
  description,
  datePublished,
  dateModified,
  canonicalUrl,
}: {
  headline: string;
  description: string;
  datePublished: string | null | undefined;
  dateModified: string;
  canonicalUrl: string;
}) {
  const site = getSiteUrl();

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: headline.slice(0, 110),
    description,
    datePublished:
      datePublished != null
        ? new Date(datePublished).toISOString()
        : undefined,
    dateModified: new Date(dateModified).toISOString(),
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
