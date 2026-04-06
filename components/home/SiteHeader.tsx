import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="home-header">
      <div className="home-header-inner">
        <Link href="/" className="home-logo">
          Byggello
        </Link>
        <nav className="home-nav-desktop" aria-label="Huvudnavigation">
          <Link href="#produkt">Produkten</Link>
          <Link href="#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Guider</Link>
          <Link href="/besiktning" className="home-nav-cta">
            Starta besiktning
          </Link>
        </nav>
        <details className="home-nav-details">
          <summary className="home-nav-summary">Meny</summary>
          <div className="home-nav-drawer">
            <Link href="#produkt">Produkten</Link>
            <Link href="#hur-det-funkar">Så funkar det</Link>
            <Link href="/artiklar">Guider</Link>
            <Link href="/besiktning" className="home-nav-cta">
              Starta besiktning
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
