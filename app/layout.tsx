import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

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
  verification: {
    google: "x9eAba2N-8VySN9qLE1GKLHbzbw2lyl_908-kkEb64c",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={plusJakartaSans.variable}>
      <body>{children}</body>
    </html>
  );
}
