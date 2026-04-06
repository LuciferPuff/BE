type BlockChild = { text?: string };
type Block = {
  _type?: string;
  children?: BlockChild[];
};

/** Enkel extraktion av visningstext ur Portable Text (för meta-beskrivning). */
export function blockContentToPlainText(blocks: unknown, maxLen = 160): string {
  if (!Array.isArray(blocks)) return "";

  const parts: string[] = [];
  for (const block of blocks as Block[]) {
    if (block._type !== "block" || !Array.isArray(block.children)) continue;
    const line = block.children
      .map((c) => (typeof c.text === "string" ? c.text : ""))
      .join("");
    if (line.trim()) parts.push(line.trim());
  }

  const full = parts.join(" ").replace(/\s+/g, " ").trim();
  if (full.length <= maxLen) return full;
  return `${full.slice(0, maxLen - 1).trim()}…`;
}
