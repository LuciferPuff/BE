import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/bilder/byggello-logo.png";

export function SiteHeader() {
  return (
    <header className="home-header">
      <div className="home-header-inner">
        <Link href="/" className="home-logo" aria-label="Byggello – startsida">
          <Image
            src={LOGO_SRC}
            alt="Byggello"
            width={420}
            height={118}
            className="home-logo-image"
            priority
          />
        </Link>
        <nav className="home-nav-desktop" aria-label="Huvudnavigation">
          <Link href="#produkt">Produkten</Link>
          <Link href="#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Artiklar</Link>
          <Link href="/guider">Guider</Link>
          <Link href="/analys" className="home-nav-cta">
            Starta analys
          </Link>
        </nav>
        <details className="home-nav-details">
          <summary className="home-nav-summary">Meny</summary>
          <div className="home-nav-drawer">
            <Link href="#produkt">Produkten</Link>
            <Link href="#hur-det-funkar">Så funkar det</Link>
            <Link href="/artiklar">Artiklar</Link>
            <Link href="/guider">Guider</Link>
            <Link href="/analys" className="home-nav-cta">
              Starta analys
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
