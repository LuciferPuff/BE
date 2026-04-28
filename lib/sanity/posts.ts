import type { PortableTextBlock } from "@portabletext/types";
import type { SanityImageSource } from "@sanity/image-url";
import { normalizeArticleSlugParam } from "@/lib/slug";
import { getSanityClient } from "@/lib/sanity/client";

export type PostCoverImage = SanityImageSource & {
  alt?: string;
  caption?: string;
};

export function getPostCoverAlt(
  cover: PostCoverImage | null | undefined,
  title: string,
): string {
  const alt = cover && typeof cover === "object" && "alt" in cover
    ? String((cover as { alt?: string }).alt ?? "").trim()
    : "";
  return alt !== "" ? alt : title;
}

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
  coverImage: PostCoverImage | null;
};

const postProjection = `{
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  body,
  seoTitle,
  description,
  seoDescription,
  coverImage
}`;

export async function getPostBySlug(
  rawSlug: string,
): Promise<PostForSeo | null> {
  const client = getSanityClient();
  if (!client) return null;

  const slug = normalizeArticleSlugParam(rawSlug);

  try {
    const post = await client.fetch<PostForSeo | null>(
      `*[_type == "post" && slug.current == $slug][0]${postProjection}`,
      { slug },
    );
    if (post) return post;

    // Om segmentet inte var encoded som förväntat, prova rå sträng (t.ex. äldre data)
    if (rawSlug.trim() !== slug) {
      return await client.fetch<PostForSeo | null>(
        `*[_type == "post" && slug.current == $slug][0]${postProjection}`,
        { slug: rawSlug.trim() },
      );
    }
  } catch {
    /* ignorera */
  }

  return null;
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

/** Alla publicerade slugs (för generateStaticParams / sitemap). */
export async function getAllPostSlugs(): Promise<string[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows = await client.fetch<string[] | null>(
      `*[_type == "post" && defined(slug.current)].slug.current`,
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

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
