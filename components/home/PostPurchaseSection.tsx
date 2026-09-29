import Link from "next/link";

export function PostPurchaseSection() {
  return (
    <section
      className="home-section home-section-alt home-post-purchase"
      aria-labelledby="post-purchase-heading"
    >
      <div className="home-container home-post-purchase-inner">
        <h2
          id="post-purchase-heading"
          className="home-section-title home-section-title-center"
        >
          Ha koll på huset – skapa din fastighetsprofil
        </h2>
        <p className="home-post-purchase-text">
          Samla underhåll, husdelar, dokument och analyser på ett ställe. Skapa
          en profil för ditt hus och få en tydlig överblick över vad som behöver
          göras – oavsett om du funderar på att köpa eller redan äger.{" "}
          <Link
            href="/logga-in?next=/profil"
            className="home-post-purchase-accent"
          >
            Skapa profil gratis
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
