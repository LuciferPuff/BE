import { HomeHero } from "@/components/home/HomeHero";
import { HowItWorks } from "@/components/home/HowItWorks";
import type { GuidePreview } from "@/components/home/LatestGuides";
import { LatestGuides } from "@/components/home/LatestGuides";
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
  const guides = await fetchLatestGuides();

  return (
    <main className="home">
      <SiteHeader />
      <HomeHero />
      <ProductTeaser />
      <HowItWorks />
      <ValueProps />
      <LatestGuides guides={guides} />
      <SiteFooter />
    </main>
  );
}
