const props = [
  {
    title: "Byggt för husköpare och husägare",
    text: "Fokus på det du behöver veta – innan budet och när du redan bor kvar.",
  },
  {
    title: "Analys och profil på ett ställe",
    text: "Förstå riskerna i annonsen, sedan behåll koll på underhåll och dokument i din fastighetsprofil.",
  },
  {
    title: "Underlag du kan använda",
    text: "Tydliga nästa steg i dialog med mäklare, bank, besiktningsman – eller när du planerar underhåll.",
  },
];

export function ValueProps() {
  return (
    <section className="home-section home-section-tight" aria-labelledby="value-heading">
      <div className="home-container">
        <h2 id="value-heading" className="home-section-title home-section-title-center">
          Varför Byggello?
        </h2>
        <div className="home-value-grid">
          {props.map((p) => (
            <div key={p.title} className="home-value-card">
              <h3 className="home-value-title">{p.title}</h3>
              <p className="home-value-text">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
