import { defineArrayMember, defineField, defineType } from "sanity";

export const tableRowType = defineType({
  name: "tableRow",
  title: "Table Row",
  type: "object",
  fields: [
    defineField({
      name: "cells",
      title: "Cells",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
  ],
});
