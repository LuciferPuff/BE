import type { PortableTextBlock } from "@portabletext/types";
import type { PostCoverImage } from "@/lib/sanity/posts";
import { normalizeArticleSlugParam } from "@/lib/slug";
import { getSanityClient } from "@/lib/sanity/client";

export type GuideForPage = {
  title: string;
  slug: string;
  publishedAt: string | null;
  _updatedAt: string;
  body: PortableTextBlock[] | null;
  seoTitle: string | null;
  description: string | null;
  coverImage: PostCoverImage | null;
};

const guideProjection = `{
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  body,
  seoTitle,
  description,
  coverImage
}`;

export function buildGuideMetaDescription(guide: GuideForPage): string {
  const fromSanity = guide.description?.trim();
  if (fromSanity) return fromSanity.slice(0, 160);
  return `Läs guiden ${guide.title} – fristående material från Byggello.`;
}

export async function getGuideBySlug(
  rawSlug: string,
): Promise<GuideForPage | null> {
  const client = getSanityClient();
  if (!client) return null;

  const slug = normalizeArticleSlugParam(rawSlug);

  try {
    const guide = await client.fetch<GuideForPage | null>(
      `*[_type == "guide" && slug.current == $slug][0]${guideProjection}`,
      { slug },
    );
    if (guide) return guide;

    if (rawSlug.trim() !== slug) {
      return await client.fetch<GuideForPage | null>(
        `*[_type == "guide" && slug.current == $slug][0]${guideProjection}`,
        { slug: rawSlug.trim() },
      );
    }
  } catch {
    /* ignorera */
  }

  return null;
}

export async function getAllGuideSlugs(): Promise<string[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows = await client.fetch<string[] | null>(
      `*[_type == "guide" && defined(slug.current)].slug.current`,
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

export type GuideListItem = {
  title: string;
  slug: string;
  publishedAt: string | null;
};

export async function getAllGuidesForList(): Promise<GuideListItem[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows =
      (await client.fetch<GuideListItem[]>(
        `*[_type == "guide" && defined(slug.current)] | order(coalesce(publishedAt, _updatedAt) desc) {
          title,
          "slug": slug.current,
          publishedAt
        }`,
      )) ?? [];
    return rows;
  } catch {
    return [];
  }
}

export type GuideSitemapEntry = {
  slug: string;
  publishedAt: string | null;
  _updatedAt: string;
};

export async function getAllGuidesForSitemap(): Promise<GuideSitemapEntry[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows =
      (await client.fetch<GuideSitemapEntry[]>(
        `*[_type == "guide" && defined(slug.current)] {
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
