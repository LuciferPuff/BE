/**
 * Artiklar som flyttats (t.ex. till /guider). Hålls ur sitemap, artikellista
 * och generateStaticParams. Redirects i next.config.ts speglar dessa.
 */
export const REDIRECTED_ARTICLE_SLUGS = [
  "fukt-i-krypgrund-orsaker-risker-kostnad",
  "vad-ar-dolda-fel",
] as const;

export type RedirectedArticleSlug =
  (typeof REDIRECTED_ARTICLE_SLUGS)[number];

export function isRedirectedArticleSlug(slug: string): boolean {
  return (REDIRECTED_ARTICLE_SLUGS as readonly string[]).includes(slug);
}

/** Next.js redirects: 301 (inte permanent: true / 308). */
export const ARTICLE_PATH_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
  statusCode: 301;
}> = [
  {
    source: "/artiklar/fukt-i-krypgrund-orsaker-risker-kostnad",
    destination: "/guider/kopa-hus-med-krypgrund",
    statusCode: 301,
  },
  {
    source: "/artiklar/vad-ar-dolda-fel",
    destination: "/guider/dolda-fel-vid-huskop",
    statusCode: 301,
  },
];
