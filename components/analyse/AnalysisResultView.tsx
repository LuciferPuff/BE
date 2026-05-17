import { Disclaimer } from "@/components/analys/Disclaimer";
import { FeedbackBox } from "@/components/analys/FeedbackBox";
import type {
  AnalysisFinding,
  AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";

function AnalysisFindingBody({ item }: { item: AnalysisFinding }) {
  const hasThreePart =
    item.vadDetAr !== "" ||
    item.varforDetSpelarRoll !== "" ||
    item.vadDuGor !== "";

  if (!hasThreePart) {
    return null;
  }

  return (
    <div className="analyse-result-parts">
      {item.vadDetAr !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Vad det är</span>
          <p className="analyse-result-part-text">{item.vadDetAr}</p>
        </div>
      )}
      {item.varforDetSpelarRoll !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Varför det spelar roll</span>
          <p className="analyse-result-part-text">{item.varforDetSpelarRoll}</p>
        </div>
      )}
      {item.vadDuGor !== "" && (
        <div className="analyse-result-part">
          <span className="analyse-result-part-label">Vad du gör</span>
          <p className="analyse-result-part-text">{item.vadDuGor}</p>
        </div>
      )}
    </div>
  );
}

type Props = {
  analysis: AnalysisResult;
  analysisId: string;
  metaLabel?: string;
  showSuggestHint?: boolean;
};

export function AnalysisResultView({
  analysis,
  analysisId,
  metaLabel = "Sparad analys.",
  showSuggestHint = true,
}: Props) {
  return (
    <div className="analyse-result" role="region" aria-label="Analysresultat">
      <p className="analyse-result-meta">{metaLabel}</p>
      {showSuggestHint && (
        <p className="analyse-result-suggest-hint">
          Något som saknades eller var fel?{" "}
          <a href="#analyse-suggest" className="analyse-result-suggest-link">
            Hoppa till kommentarsfältet
          </a>
          .
        </p>
      )}

      <section className="analyse-result-block">
        <h2 className="analyse-result-heading">Röda flaggor</h2>
        <ul className="analyse-result-list">
          {analysis.rodaFlaggor.map((item, i) => (
            <li key={`r-${i}`} className="analyse-result-item">
              <strong className="analyse-result-item-title">{item.titel}</strong>
              <AnalysisFindingBody item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section className="analyse-result-block">
        <h2 className="analyse-result-heading">Underhåll och åtgärder</h2>
        <ul className="analyse-result-list">
          {analysis.underhallsvarningar.map((item, i) => (
            <li key={`u-${i}`} className="analyse-result-item">
              <strong className="analyse-result-item-title">{item.titel}</strong>
              <AnalysisFindingBody item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section className="analyse-result-block">
        <h2 className="analyse-result-heading">Frågor till mäklaren</h2>
        <ol className="analyse-result-ol">
          {analysis.fragorTillMaklaren.map((q, i) => (
            <li key={`q-${i}`}>{q}</li>
          ))}
        </ol>
      </section>

      <Disclaimer />
      <section
        id="analyse-suggest"
        className="analyse-suggest-section"
        aria-labelledby="analyse-suggest-title"
      >
        <h2 id="analyse-suggest-title" className="analyse-result-heading">
          Förbättra analysen
        </h2>
        <p className="analyse-suggest-lede">
          Din kommentar hjälper oss att justera modellen och täppa till luckor i
          framtida analyser.
        </p>
        <FeedbackBox analysisId={analysisId} />
      </section>
    </div>
  );
}
