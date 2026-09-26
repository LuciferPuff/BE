export type TodoNoteEntry = {
  id: string;
  text: string;
  createdAt: string;
};

const MAX_NOTE_LENGTH = 200;
const MAX_NOTES = 20;

export function parseTodoNotes(raw: string | null | undefined): TodoNoteEntry[] {
  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === "object",
        )
        .map((item, index) => ({
          id: typeof item.id === "string" ? item.id : `anon-${index}`,
          text: String(item.text ?? "").trim().slice(0, MAX_NOTE_LENGTH),
          createdAt:
            typeof item.createdAt === "string" ? item.createdAt : "",
        }))
        .filter((item) => item.text.length > 0)
        .slice(0, MAX_NOTES);
    }
  } catch {
    // Legacy: en vanlig textsträng.
  }

  return [
    {
      id: "legacy",
      text: raw.trim().slice(0, MAX_NOTE_LENGTH),
      createdAt: "",
    },
  ];
}

export function serializeTodoNotes(
  notes: TodoNoteEntry[],
): string | null {
  if (notes.length === 0) return null;
  return JSON.stringify(
    notes.slice(0, MAX_NOTES).map((n) => ({
      id: n.id,
      text: n.text.slice(0, MAX_NOTE_LENGTH),
      createdAt: n.createdAt,
    })),
  );
}

export { MAX_NOTE_LENGTH, MAX_NOTES };
