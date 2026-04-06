import type { MetadataRoute } from "next";
import { getAllPostsForSitemap } from "@/lib/sanity/posts";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const posts = await getAllPostsForSitemap();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/artiklar",
    "/besiktning",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = posts.map((p) => {
    const last =
      p.publishedAt != null
        ? new Date(p.publishedAt)
        : new Date(p._updatedAt);
    return {
      url: `${base}/artiklar/${p.slug}`,
      lastModified: last,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...articleRoutes];
}
