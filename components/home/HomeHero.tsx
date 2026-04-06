import Link from "next/link";

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="home-hero-inner">
        <p className="home-hero-eyebrow">Bostadsanalys för husköpare</p>
        <h1 id="home-hero-heading" className="home-hero-title">
          Förstå bostaden innan du köper
        </h1>
        <p className="home-hero-lead">
          Genomför en strukturerad analys online, få tydliga insikter och en rapport
          du kan lita på – direkt i webbläsaren.
        </p>
        <div className="home-hero-actions">
          <Link href="/analys" className="home-btn home-btn-primary">
            Starta analys
          </Link>
          <Link href="#hur-det-funkar" className="home-btn home-btn-ghost">
            Så funkar det
          </Link>
        </div>
      </div>
    </section>
  );
}
