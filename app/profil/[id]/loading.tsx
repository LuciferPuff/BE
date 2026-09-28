import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";

export default function PropertyDashboardLoading() {
  return (
    <main className="home my-analyses-page">
      <SiteHeader />
      <section
        className="my-analyses-hero my-analyses-hero--nav-only"
        aria-hidden="true"
      >
        <div className="home-container my-analyses-hero-inner">
          <p className="profile-account-nav">
            <span className="my-analyses-back">← Mina hus</span>
          </p>
        </div>
      </section>
      <div className="home-container my-analyses-content profile-dashboard-content">
        <div className="profile-dashboard" aria-busy="true" aria-label="Laddar fastighet">
          <header className="profile-dashboard-header">
            <div className="profile-dashboard-header-main">
              <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title profile-panel-skeleton-line--hero" />
              <div className="profile-panel-skeleton-line profile-panel-skeleton-line--short" />
            </div>
          </header>
          <div className="profile-dashboard-grid">
            <div className="profile-dashboard-primary">
              <div className="profile-dashboard-panel profile-panel-skeleton">
                <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title" />
                <div className="profile-panel-skeleton-line" />
                <div className="profile-panel-skeleton-line profile-panel-skeleton-line--short" />
              </div>
              <div className="profile-dashboard-panel profile-panel-skeleton">
                <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title" />
                <div className="profile-panel-skeleton-line" />
              </div>
            </div>
            <aside className="profile-dashboard-aside">
              <div className="profile-dashboard-panel profile-panel-skeleton">
                <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title" />
                <div className="profile-panel-skeleton-line" />
              </div>
              <div className="profile-dashboard-panel profile-panel-skeleton">
                <div className="profile-panel-skeleton-line" />
                <div className="profile-panel-skeleton-line profile-panel-skeleton-line--short" />
              </div>
            </aside>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
