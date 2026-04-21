import type { ReactNode } from "react";

import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";

type Props = {
  children: React.ReactNode;
  breadcrumb: ReactNode;
  /** Visas som liten etikett under länkstigen, t.ex. «Artikel». */
  kindLabel?: string;
};

export function ContentPageShell({
  children,
  breadcrumb,
  kindLabel,
}: Props) {
  return (
    <main className="content-page">
      <SiteHeader />
      <div className="content-page-main">
        <div className="home-container content-page-inner">
          {breadcrumb}
          {kindLabel != null && kindLabel !== "" && (
            <p className="content-page-eyebrow">{kindLabel}</p>
          )}
          {children}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
