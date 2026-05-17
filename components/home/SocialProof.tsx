type Props = {
  count: number | null;
};

function formatCountLabel(count: number): string {
  if (count === 1) return "1 analys genomförd";
  return `${count.toLocaleString("sv-SE")} analyser genomförda`;
}

export function SocialProof({ count }: Props) {
  const showCount = count != null && count > 0;

  return (
    <section className="home-social-proof" aria-label="Varför Byggello">
      <div className="home-container home-social-proof-row">
        {showCount && (
          <>
            <span className="home-social-proof-count" role="status">
              {formatCountLabel(count)}
            </span>
            <span className="home-social-proof-divider" aria-hidden="true">
              ·
            </span>
          </>
        )}
        <span className="home-social-proof-text">
          Ett missat fuktproblem kan kosta 300&nbsp;000 kr. En analys tar 2
          minuter.
        </span>
      </div>
    </section>
  );
}
