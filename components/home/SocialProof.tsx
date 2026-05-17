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
      <div className="home-container">
        <div className="home-social-proof-inner">
          {showCount && (
            <p className="home-social-proof-count" role="status">
              {formatCountLabel(count)}
            </p>
          )}
          <p className="home-social-proof-message">
            Ett missat fuktproblem kan kosta 300&nbsp;000 kr. En analys tar 2
            minuter.
          </p>
        </div>
      </div>
    </section>
  );
}
