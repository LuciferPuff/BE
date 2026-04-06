import type { PortableTextBlock } from "@portabletext/types";
import { blockContentToPlainText } from "@/lib/sanity/blockToPlainText";
import { getSanityClient } from "@/lib/sanity/client";

export type PostForSeo = {
  title: string;
  slug: string;
  publishedAt: string | null;
  _updatedAt: string;
  body: PortableTextBlock[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

const postProjection = `{
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  body,
  seoTitle,
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

export function buildArticleDescription(post: PostForSeo): string {
  if (post.seoDescription?.trim()) {
    return post.seoDescription.trim().slice(0, 160);
  }
  const fromBody = blockContentToPlainText(post.body, 160);
  if (fromBody) return fromBody;
  return `Artikel från Byggello: ${post.title}`;
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
