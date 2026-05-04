import Link from "next/link";

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="home-hero-inner">
        <h1 id="home-hero-heading" className="home-hero-title">
          Din partner genom hela bostadsresan
        </h1>
        <p className="home-hero-lead">
          Förstå bostaden innan du köper – och känn dig trygg länge efter med vår
          fastighetsprofil – vi hjälper dig ha koll, så du kan vara lugn i ditt
          bostadsägande.
        </p>
        <div className="home-hero-actions">
          <Link href="/analys" className="home-btn home-btn-primary">
            Starta analys
          </Link>
          <Link href="/#hur-det-funkar" className="home-btn home-btn-ghost">
            Så funkar det
          </Link>
        </div>
      </div>
    </section>
  );
}
