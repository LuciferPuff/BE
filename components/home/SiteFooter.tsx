import Image from "next/image";
import Link from "next/link";

import { getSessionUser } from "@/lib/auth/get-session-user";

const LOGO_SRC = "/bilder/byggello-logo.png";

export async function SiteFooter() {
  let showMyAnalyses = false;
  try {
    const user = await getSessionUser();
    showMyAnalyses = user != null;
  } catch {
    showMyAnalyses = false;
  }

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
          <Link href="/#produkt">Produkten</Link>
          <Link href="/#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Artiklar</Link>
          <Link href="/guider">Guider</Link>
          <Link href="/analys">Analys</Link>
          {showMyAnalyses && <Link href="/mina-analyser">Mina analyser</Link>}
          <Link href="/integritetspolicy">Integritetspolicy</Link>
        </nav>
        <p className="home-footer-copy">
          © {new Date().getFullYear()} Byggello
        </p>
      </div>
    </footer>
  );
}
