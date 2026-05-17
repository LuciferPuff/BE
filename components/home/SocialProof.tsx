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
          Se vad som kan gömma sig i annonsen innan du lägger bud.
        </span>
      </div>
    </section>
  );
}
