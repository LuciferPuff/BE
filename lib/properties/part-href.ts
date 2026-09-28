/** Delad (server+client) hjälp för ?del=-länkar. */

export function partIdFromDelHref(href: string): string | null {
  try {
    const q = href.includes("?")
      ? href.slice(href.indexOf("?"))
      : href.startsWith("?")
        ? href
        : null;
    if (!q) return null;
    const del = new URLSearchParams(q).get("del");
    return del?.trim() || null;
  } catch {
    return null;
  }
}
