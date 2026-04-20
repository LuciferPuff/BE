import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Byggello – Din partner genom hela bostadsresan",
    template: "%s | Byggello",
  },
  description:
    "Strukturerad bostadsanalys online, tydliga rapporter och guider för dig som ska köpa hus eller lägenhet.",
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
  icons: {
    icon: "/bilder/byggello-logo.png",
    apple: "/bilder/byggello-logo.png",
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
