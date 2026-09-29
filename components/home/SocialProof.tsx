type Props = {
  count: number | null;
};

/** Visningsoffset – faktiskt antal i DB + detta. */
const DISPLAY_COUNT_OFFSET = 1000;

function formatCountLabel(count: number): string {
  if (count === 1) return "1 analys genomförd";
  return `${count.toLocaleString("sv-SE")} analyser genomförda`;
}

export function SocialProof({ count }: Props) {
  const displayCount =
    count != null && count > 0 ? count + DISPLAY_COUNT_OFFSET : null;
  const showCount = displayCount != null;

  return (
    <section className="home-social-proof" aria-label="Varför Byggello">
      <div className="home-container home-social-proof-row">
        {showCount && (
          <>
            <span className="home-social-proof-count" role="status">
              {formatCountLabel(displayCount)}
            </span>
            <span className="home-social-proof-divider" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <span className="home-social-proof-text">
          Förstå bostaden innan bud – och ha koll efteråt med din profil.
        </span>
      </div>
    </section>
  );
}
