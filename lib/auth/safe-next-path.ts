/** Tillåter endast interna sökvägar efter inloggning. */
export function safeNextPath(next: string | null | undefined): string {
  if (next == null || next === "") return "/profil";
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/profil";
  if (path.startsWith("/api") || path.startsWith("/auth")) return "/profil";
  return path;
}
