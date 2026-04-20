import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/bilder/byggello-logo.png";

export function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container home-footer-inner">
        <div className="home-footer-brand">
          <Image
            src={LOGO_SRC}
            alt="Byggello"
            width={360}
            height={100}
            className="home-footer-logo-image"
          />
          <p className="home-footer-tagline">
            Bostadsanalys och rapporter för tryggare bostadsköp.
          </p>
        </div>
        <nav className="home-footer-nav" aria-label="Sidfot">
          <Link href="#produkt">Produkten</Link>
          <Link href="#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Artiklar</Link>
          <Link href="/guider">Guider</Link>
          <Link href="/analys">Analys</Link>
        </nav>
        <p className="home-footer-copy">
          © {new Date().getFullYear()} Byggello
        </p>
      </div>
    </footer>
  );
}
