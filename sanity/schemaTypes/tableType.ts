import { defineArrayMember, defineField, defineType } from "sanity";

export const tableType = defineType({
  name: "table",
  title: "Table",
  type: "object",
  fields: [
    defineField({
      name: "rows",
      title: "Rows",
      type: "array",
      of: [defineArrayMember({ type: "tableRow" })],
    }),
  ],
  preview: {
    select: {
      rows: "rows",
    },
    prepare({ rows }: { rows?: Array<{ cells?: string[] }> }) {
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      const firstRow = rowCount > 0 && Array.isArray(rows?.[0]?.cells) ? rows[0].cells : [];
      const colCount = Array.isArray(firstRow) ? firstRow.length : 0;
      return {
        title: "Tabell",
        subtitle: `${rowCount} rader • ${colCount} kolumner`,
      };
    },
  },
});
