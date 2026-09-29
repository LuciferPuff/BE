import Link from "next/link";

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="home-hero-inner">
        <h1 id="home-hero-heading" className="home-hero-title">
          Din partner genom hela bostadsresan
        </h1>
        <p className="home-hero-lead">
          Analysera bostaden innan du köper – och skapa en fastighetsprofil för
          att ha koll på underhåll, dokument och nästa steg. Så blir du lugnare
          både före och efter köpet.
        </p>
        <div className="home-hero-actions">
          <Link
            href="/logga-in?next=/profil"
            className="home-btn home-btn-primary"
          >
            Skapa fastighetsprofil
          </Link>
          <Link href="/analys" className="home-btn home-btn-ghost">
            Starta analys
          </Link>
        </div>
      </div>
    </section>
  );
}
