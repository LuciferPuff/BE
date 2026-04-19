import type { StructureResolver } from "sanity/structure";

/**
 * Explicit lista så Post och Guide alltid syns i sidomenyn (inte bara "Post").
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.documentTypeListItem("post").title("Artiklar (Post)"),
      S.documentTypeListItem("guide").title("Guider"),
    ]);
