/** Tillåter endast interna sökvägar efter inloggning. */
export function safeNextPath(next: string | null | undefined): string {
  if (next == null || next === "") return "/analys";
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/analys";
  if (path.startsWith("/api") || path.startsWith("/auth")) return "/analys";
  return path;
}
