import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Byggello – digital besiktning för husköpare",
    template: "%s | Byggello",
  },
  description:
    "Onlinebesiktning av bostad, tydliga rapporter och guider för dig som ska köpa hus eller lägenhet.",
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
