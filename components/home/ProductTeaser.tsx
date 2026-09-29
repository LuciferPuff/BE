import Link from "next/link";

export function ProductTeaser() {
  return (
    <section id="produkt" className="home-section home-section-alt">
      <div className="home-container">
        <div className="home-product-grid">
          <div>
            <h2 className="home-section-title">Byggello ser det mäklaren inte berättar</h2>
            <p className="home-section-intro">
              Vi analyserar bostaden utifrån byggnadsår, konstruktion och vad som saknas
              i annonsen – och ger dig konkreta frågor att ställa innan du lägger bud.
              Sedan samlar du allt i en fastighetsprofil så du behåller koll.
            </p>
            <ul className="home-checklist">
              <li>Digital bostadsanalys anpassad för bostadsköp</li>
              <li>Fastighetsprofil för underhåll, dokument och nästa steg</li>
              <li>Perfekt komplement till teknisk besiktning och rådgivning</li>
            </ul>
            <div className="home-hero-actions">
              <Link
                href="/logga-in?next=/profil"
                className="home-btn home-btn-primary"
              >
                Skapa profil
              </Link>
              <Link href="/analys" className="home-link-all">
                Starta analys
              </Link>
            </div>
          </div>
          <div className="home-product-card" aria-hidden="true">
            <div className="home-product-card-inner">
              <span className="home-product-label">Analys</span>
              <p className="home-product-card-title">Innan du köper</p>
              <p className="home-product-card-text">
                Röda flaggor, frågor till mäklaren och vad som kan bli dyrt.
              </p>
              <div className="home-product-divider" />
              <span className="home-product-label">Profil</span>
              <p className="home-product-card-title">Koll på huset</p>
              <p className="home-product-card-text">
                Husdelar, dokument och underhåll – samlat på ett ställe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
