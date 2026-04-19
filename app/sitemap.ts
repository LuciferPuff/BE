import type { MetadataRoute } from "next";
import { getAllGuidesForSitemap } from "@/lib/sanity/guides";
import { getAllPostsForSitemap } from "@/lib/sanity/posts";
import { getSiteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const posts = await getAllPostsForSitemap();
  const guides = await getAllGuidesForSitemap();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/artiklar",
    "/guider",
    "/analys",
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

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => {
    const last =
      g.publishedAt != null
        ? new Date(g.publishedAt)
        : new Date(g._updatedAt);
    return {
      url: `${base}/guider/${g.slug}`,
      lastModified: last,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...articleRoutes, ...guideRoutes];
}
