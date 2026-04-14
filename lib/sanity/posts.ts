import type { PortableTextBlock } from "@portabletext/types";
import { getSanityClient } from "@/lib/sanity/client";

export type PostForSeo = {
  title: string;
  slug: string;
  publishedAt: string | null;
  _updatedAt: string;
  body: PortableTextBlock[] | null;
  seoTitle: string | null;
  /** Meta description (stringfält i Studio). */
  description: string | null;
  /** Finns kvar i äldre dokument; inte längre i schema. */
  seoDescription: string | null;
};

const postProjection = `{
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  body,
  seoTitle,
  description,
  seoDescription
}`;

export async function getPostBySlug(
  slug: string,
): Promise<PostForSeo | null> {
  const client = getSanityClient();
  if (!client) return null;

  try {
    return await client.fetch<PostForSeo | null>(
      `*[_type == "post" && slug.current == $slug][0]${postProjection}`,
      { slug },
    );
  } catch {
    return null;
  }
}

/** Meta description för &lt;meta&gt;, Open Graph, JSON-LD. */
export function buildArticleDescription(post: PostForSeo): string {
  const fromSanity =
    post.description?.trim() || post.seoDescription?.trim();
  if (fromSanity) return fromSanity.slice(0, 160);
  return `Läs mer om ${post.title} – guider och tips för husköpare på Byggello.`;
}

export type PostSitemapEntry = {
  slug: string;
  publishedAt: string | null;
  _updatedAt: string;
};

export async function getAllPostsForSitemap(): Promise<PostSitemapEntry[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows =
      (await client.fetch<PostSitemapEntry[]>(
        `*[_type == "post" && defined(slug.current)] {
          "slug": slug.current,
          publishedAt,
          _updatedAt
        }`,
      )) ?? [];
    return rows;
  } catch {
    return [];
  }
}
