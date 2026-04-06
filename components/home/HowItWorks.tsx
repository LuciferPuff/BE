const steps = [
  {
    n: "01",
    title: "Skapa och kom igång",
    text: "Välj bostad och följ guiden. Du behöver inga förkunskaper – vi leder dig genom varje del.",
  },
  {
    n: "02",
    title: "Genomför besiktningen",
    text: "Dokumentera och svara i ditt eget tempo. Allt samlas på ett ställe.",
  },
  {
    n: "03",
    title: "Få rapport och nästa steg",
    text: "När du är klar får du en tydlig rapport och rekommenderade fortsättningar.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="hur-det-funkar"
      className="home-section"
      aria-labelledby="how-heading"
    >
      <div className="home-container">
        <h2 id="how-heading" className="home-section-title home-section-title-center">
          Så funkar det
        </h2>
        <p className="home-section-subtitle">
          Tre enkla steg från första klick till färdigt underlag.
        </p>
        <ol className="home-steps">
          {steps.map((s) => (
            <li key={s.n} className="home-step">
              <span className="home-step-num">{s.n}</span>
              <h3 className="home-step-title">{s.title}</h3>
              <p className="home-step-text">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
