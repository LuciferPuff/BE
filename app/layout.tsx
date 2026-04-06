import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Byggello – digital besiktning för husköpare",
    template: "%s | Byggello",
  },
  description:
    "Onlinebesiktning av bostad, tydliga rapporter och guider för dig som ska köpa hus eller lägenhet.",
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "Byggello",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
