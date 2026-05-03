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
            </p>
            <ul className="home-checklist">
              <li>Digital bostadsanalys anpassad för bostadsköp</li>
              <li>Dokumenterat underlag och tydliga nästa steg</li>
              <li>Perfekt komplement till teknisk besiktning och rådgivning</li>
            </ul>
            <Link href="/analys" className="home-btn home-btn-primary">
              Kom igång
            </Link>
          </div>
          <div className="home-product-card" aria-hidden="true">
            <div className="home-product-card-inner">
              <span className="home-product-label">I verktyget</span>
              <p className="home-product-card-title">Struktur &amp; trygghet</p>
              <p className="home-product-card-text">
                Svara på frågor, ladda upp material och få överblick över
                bostadens skick.
              </p>
              <div className="home-product-divider" />
              <span className="home-product-label">Efteråt</span>
              <p className="home-product-card-title">Rapport</p>
              <p className="home-product-card-text">
                Sammanfattning och underlag du kan använda i köpprocessen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
