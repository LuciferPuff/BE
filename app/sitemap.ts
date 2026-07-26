import type { MetadataRoute } from "next";
import { getAllGuidesForSitemap } from "@/lib/sanity/guides";
import { getAllPostsForSitemap } from "@/lib/sanity/posts";

/** Kanonisk produktion-URL – aldrig VERCEL_URL / request-host (preview avvisas av Google). */
const BASE_URL = "https://byggello.se";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPostsForSitemap();
  const guides = await getAllGuidesForSitemap();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/artiklar",
    "/guider",
    "/analys",
    "/integritetspolicy",
  ].map((path) => ({
    url: `${BASE_URL}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/integritetspolicy" ? 0.3 : 0.8,
  }));

  const articleRoutes: MetadataRoute.Sitemap = posts.map((p) => {
    const last =
      p.publishedAt != null
        ? new Date(p.publishedAt)
        : new Date(p._updatedAt);
    return {
      url: `${BASE_URL}/artiklar/${p.slug}`,
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
      url: `${BASE_URL}/guider/${g.slug}`,
      lastModified: last,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...articleRoutes, ...guideRoutes];
}
