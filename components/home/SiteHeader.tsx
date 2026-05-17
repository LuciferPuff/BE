import Image from "next/image";
import Link from "next/link";

import { createAuthClient } from "@/lib/supabase/auth-client";

const LOGO_SRC = "/bilder/byggello-logo.png";

function truncateEmail(email: string, max = 22): string {
  if (email.length <= max) return email;
  const at = email.indexOf("@");
  if (at <= 0) return `${email.slice(0, max - 1)}…`;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 8) return `${email.slice(0, max - 1)}…`;
  return `${local.slice(0, 6)}…${domain}`;
}

async function AuthNav() {
  let email: string | null = null;

  try {
    const supabase = await createAuthClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? null;
  } catch {
    return (
      <Link href="/logga-in" className="home-nav-auth-link">
        Logga in
      </Link>
    );
  }

  if (email) {
    return (
      <span className="home-nav-auth home-nav-auth--signed-in">
        <span className="home-nav-auth-email" title={email}>
          {truncateEmail(email)}
        </span>
        <form action="/api/auth/logout" method="post" className="home-nav-auth-logout">
          <button type="submit" className="home-nav-auth-logout-btn">
            Logga ut
          </button>
        </form>
      </span>
    );
  }

  return (
    <Link href="/logga-in" className="home-nav-auth-link">
      Logga in
    </Link>
  );
}

export async function SiteHeader() {
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
          <Link href="/#produkt">Produkten</Link>
          <Link href="/#hur-det-funkar">Så funkar det</Link>
          <Link href="/artiklar">Artiklar</Link>
          <Link href="/guider">Guider</Link>
          <AuthNav />
          <Link href="/analys" className="home-nav-cta">
            Starta analys
          </Link>
        </nav>
        <details className="home-nav-details">
          <summary className="home-nav-summary">Meny</summary>
          <div className="home-nav-drawer">
            <Link href="/#produkt">Produkten</Link>
            <Link href="/#hur-det-funkar">Så funkar det</Link>
            <Link href="/artiklar">Artiklar</Link>
            <Link href="/guider">Guider</Link>
            <AuthNav />
            <Link href="/analys" className="home-nav-cta">
              Starta analys
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
