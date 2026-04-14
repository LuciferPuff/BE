import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import type { GuidePreview } from "@/components/home/LatestGuides";
import { LatestGuides } from "@/components/home/LatestGuides";
import { PostPurchaseSection } from "@/components/home/PostPurchaseSection";
import { ProductTeaser } from "@/components/home/ProductTeaser";
import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { ValueProps } from "@/components/home/ValueProps";
import { getSanityClient } from "@/lib/sanity/client";
import { getSiteUrl } from "@/lib/site";
import type { Metadata } from "next";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/` },
  openGraph: { url: siteUrl },
};

export const revalidate = 600;

const MIN_POSTS_FOR_GUIDES_SECTION = 5;

async function fetchPostCount(): Promise<number> {
  const client = getSanityClient();
  if (!client) return 0;

  try {
    const n = await client.fetch<number>(
      `count(*[_type == "post" && defined(slug.current)])`,
    );
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}

async function fetchLatestGuides(): Promise<GuidePreview[]> {
  const client = getSanityClient();
  if (!client) return [];

  try {
    const rows = await client.fetch<
      { title: string; slug: string; publishedAt: string | null }[]
    >(
      `*[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _updatedAt) desc) [0...3] {
        title,
        "slug": slug.current,
        publishedAt
      }`
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const postCount = await fetchPostCount();
  const showGuides = postCount >= MIN_POSTS_FOR_GUIDES_SECTION;
  const guides = showGuides ? await fetchLatestGuides() : [];

  return (
    <main className="home">
      <SiteHeader />
      <HomeHero />
      <ProductTeaser />
      <HowItWorks />
      <ValueProps />
      <PostPurchaseSection />
      {showGuides && <LatestGuides guides={guides} />}
      <SiteFooter />
    </main>
  );
}
