import Link from "next/link";
import type { Metadata } from "next";

import { ContentBreadcrumb } from "@/components/layout/ContentBreadcrumb";
import { ContentPageShell } from "@/components/layout/ContentPageShell";
import { getSiteUrl } from "@/lib/site";

const base = getSiteUrl();
const canonical = `${base}/integritetspolicy`;

export const metadata: Metadata = {
  title: "Integritetspolicy",
  description:
    "Så hanterar Byggello dina personuppgifter enligt GDPR – vad vi samlar in, varför, hur länge och dina rättigheter.",
  alternates: { canonical },
  openGraph: {
    type: "article",
    url: canonical,
    title: "Integritetspolicy | Byggello",
    description:
      "Så hanterar Byggello dina personuppgifter enligt GDPR – vad vi samlar in, varför, hur länge och dina rättigheter.",
    locale: "sv_SE",
    siteName: "Byggello",
  },
  robots: { index: true, follow: true },
};

export default function IntegritetspolicyPage() {
  return (
    <ContentPageShell
      kindLabel="Policy"
      breadcrumb={
        <ContentBreadcrumb
          items={[
            { label: "Startsida", href: "/" },
            { label: "Integritetspolicy" },
          ]}
        />
      }
    >
      <div className="content-article-column">
        <article className="article-card content-article-card">
          <div className="content-article-head">
            <h1 className="article-title">Integritetspolicy</h1>
            <p className="article-meta">Senast uppdaterad: maj 2026</p>
          </div>
          <div className="article-body">
            <p>
              Byggello värnar om din integritet. Den här policyn förklarar
              vilken information vi samlar in, varför vi gör det och hur den
              hanteras.
            </p>

            <h2>Vem är ansvarig för dina uppgifter</h2>
            <p>
              Byggello (Bostadslotsen Sverige AB) är personuppgiftsansvarig för
              de uppgifter som samlas in via byggello.se. Kontakt:{" "}
              <a href="mailto:hej@byggello.se">hej@byggello.se</a>
            </p>

            <h2>Vad vi samlar in och varför</h2>
            <p>Vi samlar in följande information:</p>
            <ul>
              <li>
                <strong>E-postadress</strong> – om du prenumererar på vårt
                nyhetsbrev. Används enbart för att skicka relevanta
                uppdateringar. Du kan avregistrera dig när som helst.
              </li>
              <li>
                <strong>Annonstext och fastighetsdata</strong> – information du
                klistrar in i vår analysator. Används för att generera din
                analys och sparas i anonymiserad form för att förbättra
                tjänsten.
              </li>
              <li>
                <strong>IP-adress</strong> – används för att begränsa antalet
                analyser per användare och förhindra missbruk. Sparas inte
                längre än nödvändigt.
              </li>
            </ul>

            <h2>Freemium och premium</h2>
            <p>
              Byggello erbjuder en kostnadsfri nivå där anonymiserad
              fastighetsdata kan användas för aggregerade insikter och
              produktutveckling. På premiumnivå äger du din data – den används
              inte för något annat ändamål.
            </p>

            <h2>Hur länge sparar vi dina uppgifter</h2>
            <ul>
              <li>E-postadresser sparas tills du avregistrerar dig</li>
              <li>Analysdata sparas i upp till 12 månader</li>
              <li>IP-adresser för rate limiting raderas löpande</li>
            </ul>

            <h2>Dina rättigheter</h2>
            <p>Enligt GDPR har du rätt att:</p>
            <ul>
              <li>Begära ett utdrag av de uppgifter vi har om dig</li>
              <li>Begära att vi raderar dina uppgifter</li>
              <li>Invända mot behandling av dina uppgifter</li>
            </ul>
            <p>
              Kontakta oss på{" "}
              <a href="mailto:hej@byggello.se">hej@byggello.se</a> för att utöva
              dina rättigheter.
            </p>

            <h2>Cookies</h2>
            <p>
              Byggello använder inga spårningscookies eller reklamcookies. Vi
              använder enbart tekniska cookies som är nödvändiga för att sajten
              ska fungera.
            </p>

            <h2>Tredjepartsleverantörer</h2>
            <p>Vi använder följande leverantörer för att driva tjänsten:</p>
            <ul>
              <li>
                <strong>Supabase</strong> – databaslagring (EU West)
              </li>
              <li>
                <strong>Vercel</strong> – hosting
              </li>
              <li>
                <strong>Resend</strong> – e-postutskick
              </li>
              <li>
                <strong>Anthropic</strong> – AI-analys (data skickas för
                bearbetning men sparas inte av Anthropic enligt deras
                databehandlingsavtal)
              </li>
            </ul>

            <h2>Kontakt</h2>
            <p>
              Har du frågor om hur vi hanterar dina uppgifter? Kontakta oss på{" "}
              <a href="mailto:hej@byggello.se">hej@byggello.se</a>
            </p>

            <p>
              <Link href="/">Tillbaka till startsidan</Link>
            </p>
          </div>
        </article>
      </div>
    </ContentPageShell>
  );
}
