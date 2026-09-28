export function ProfilePanelSkeleton({
  label = "Laddar…",
}: {
  label?: string;
}) {
  return (
    <div
      className="profile-dashboard-panel profile-panel-skeleton"
      aria-busy="true"
      aria-label={label}
    >
      <div className="profile-panel-skeleton-line profile-panel-skeleton-line--title" />
      <div className="profile-panel-skeleton-line" />
      <div className="profile-panel-skeleton-line profile-panel-skeleton-line--short" />
    </div>
  );
}

export function ProfileAsideSkeleton() {
  return (
    <>
      <ProfilePanelSkeleton label="Laddar tidslinje" />
      <ProfilePanelSkeleton label="Laddar dokument" />
    </>
  );
}
