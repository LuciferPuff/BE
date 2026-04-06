const props = [
  {
    title: "Byggt för husköpare",
    text: "Fokus på det du behöver veta – inte teknisk jargong du måste googla.",
  },
  {
    title: "Digitalt från start",
    text: "Inget papperskrångel. Jobba när det passar dig, på mobil eller dator.",
  },
  {
    title: "Underlag du kan använda",
    text: "Rapporten ger struktur i dialog med mäklare, bank eller besiktningsman.",
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
