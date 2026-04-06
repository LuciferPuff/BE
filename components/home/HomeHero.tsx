import Link from "next/link";

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="home-hero-inner">
        <p className="home-hero-eyebrow">Digital besiktning för husköpare</p>
        <h1 id="home-hero-heading" className="home-hero-title">
          Förstå bostaden innan du köper
        </h1>
        <p className="home-hero-lead">
          Genomför en strukturerad onlinebesiktning, få tydliga insikter och en
          rapport du kan lita på – direkt i webbläsaren.
        </p>
        <div className="home-hero-actions">
          <Link href="/besiktning" className="home-btn home-btn-primary">
            Starta besiktning
          </Link>
          <Link href="#hur-det-funkar" className="home-btn home-btn-ghost">
            Så funkar det
          </Link>
        </div>
      </div>
    </section>
  );
}
