import Link from "next/link";

export const metadata = {
  title: "Starta besiktning | Byggello",
  description: "Kom igång med digital besiktning av bostad.",
};

export default function BesiktningPage() {
  return (
    <main className="article-page">
      <nav className="article-nav" aria-label="Navigering">
        <Link href="/">← Till startsidan</Link>
      </nav>
      <article className="article-card">
        <h1 className="article-title">Starta besiktning</h1>
        <p className="article-lead">
          Här kopplar du snart ihop ditt riktiga besiktningsflöde (inloggning,
          betalning eller liknande).
        </p>
        <div className="article-body">
          <p>
            Under tiden kan du läsa våra{" "}
            <Link href="/artiklar">guider för husköpare</Link> eller gå tillbaka
            till <Link href="/">startsidan</Link>.
          </p>
        </div>
      </article>
    </main>
  );
}
