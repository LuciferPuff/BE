import Link from "next/link";

export type GuidePreview = {
  title: string;
  slug: string;
  publishedAt: string | null;
};

export function LatestGuides({ guides }: { guides: GuidePreview[] }) {
  return (
    <section
      id="artiklar"
      className="home-section home-section-alt"
      aria-labelledby="artiklar-heading"
    >
      <div className="home-container">
        <div className="home-guides-head">
          <div>
            <h2 id="artiklar-heading" className="home-section-title">
              Artiklar
            </h2>
            <p className="home-section-intro home-section-intro-narrow">
              Läs mer om köpprocessen, vad du ska tänka på och hur du förbereder
              dig – innan du signerar.
            </p>
          </div>
          <Link href="/artiklar" className="home-link-all">
            Alla artiklar →
          </Link>
        </div>
        {guides.length === 0 ? (
          <p className="home-guides-empty">
            Artiklar publiceras snart i Sanity Studio.
          </p>
        ) : (
          <ul className="home-guides-grid">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/artiklar/${g.slug}`} className="home-guide-card">
                  <span className="home-guide-meta">
                    {g.publishedAt
                      ? new Date(g.publishedAt).toLocaleDateString("sv-SE", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Nyhet"}
                  </span>
                  <span className="home-guide-title">{g.title}</span>
                  <span className="home-guide-cta">Läs mer</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
