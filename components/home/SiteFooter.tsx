import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container home-footer-inner">
        <div className="home-footer-brand">
          <span className="home-footer-logo">Byggello</span>
          <p className="home-footer-tagline">
            Bostadsanalys och rapporter för tryggare bostadsköp.
          </p>
        </div>
        <nav className="home-footer-nav" aria-label="Sidfot">
          <Link href="#produkt">Produkten</Link>
          <Link href="#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Guider</Link>
          <Link href="/analys">Analys</Link>
        </nav>
        <p className="home-footer-copy">
          © {new Date().getFullYear()} Byggello
        </p>
      </div>
    </footer>
  );
}
