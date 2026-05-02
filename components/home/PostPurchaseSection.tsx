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
          Byggello följer med efter köpet
        </h2>
        <p className="home-post-purchase-text">
          När du köpt klart skapar Byggello en fastighetsprofil för ditt hus.
          Håll koll på underhåll, spara dokumentation och planera framtida
          projekt – allt på ett ställe.{" "}
          <span className="home-post-purchase-accent">Kom igång gratis.</span>
        </p>
      </div>
    </section>
  );
}
