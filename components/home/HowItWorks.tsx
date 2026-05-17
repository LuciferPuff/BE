import Link from "next/link";

const steps = [
  {
    n: "01",
    title: "Klistra in annonsen",
    text: "Kopiera informationen från bostadsannonsen på mäklarens sida och klistra in i Byggello. Adress, byggnadsår, annonstext – ju mer du lämnar in, desto bättre analys.",
  },
  {
    n: "02",
    title: "Få din analys",
    text: "Byggello analyserar bostaden baserat på byggnadsår, konstruktion och vad som saknas i annonsen. Du får röda flaggor, underhållsvarningar och konkreta frågor att ställa mäklaren.",
  },
  {
    n: "03",
    title: "Gå in i köpet förberedd",
    text: "Med analysen i handen vet du vad du ska titta extra noga på, vad som kan bli dyrt och vad du ska förhandla om. Gratis under beta.",
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
          Från annons till trygghet – på tre steg.
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
        <div className="home-how-alt-cta">
          <p className="home-how-alt-cta-text">
            Inte redo att analysera ett objekt ännu? Logga in eller skapa ett konto för
            att spara dina analyser och hålla koll på dina objekt – kostnadsfritt.
          </p>
          <Link href="/logga-in" className="home-btn home-btn-primary">
            Logga in
          </Link>
        </div>
      </div>
    </section>
  );
}
