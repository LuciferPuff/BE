import Link from "next/link";
import type { Metadata } from "next";

import { UnsubscribeConfirm } from "@/components/avregistrera/UnsubscribeConfirm";
import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { getSiteUrl } from "@/lib/site";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const base = getSiteUrl();
const canonical = `${base}/avregistrera`;

export const metadata: Metadata = {
  title: "Avregistrera",
  description:
    "Avregistrera din e-postadress från Byggellos uppdateringar.",
  alternates: { canonical },
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function AvregistreraPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const rawToken = Array.isArray(token) ? token[0] : token;
  const isValid = typeof rawToken === "string" && UUID_RE.test(rawToken);

  return (
    <ContentPageShell
      kindLabel="Avregistrering"
      breadcrumb={
        <ContentBreadcrumb
          items={[
            { label: "Startsida", href: "/" },
            { label: "Avregistrera" },
          ]}
        />
      }
    >
      <div className="content-article-column">
        <article className="article-card content-article-card">
          <div className="content-article-head">
            <h1 className="article-title">Avregistrera</h1>
          </div>
          <div className="article-body">
            {isValid && rawToken ? (
              <UnsubscribeConfirm token={rawToken} />
            ) : (
              <>
                <p>
                  Länken saknar ett giltigt token. Använd avregistrerings­länken
                  i ditt välkomstmail eller kontakta oss på{" "}
                  <a href="mailto:hej@byggello.se">hej@byggello.se</a> så hjälper
                  vi dig.
                </p>
                <p>
                  <Link href="/">Tillbaka till startsidan</Link>
                </p>
              </>
            )}
          </div>
        </article>
      </div>
    </ContentPageShell>
  );
}
