import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Namngiven portable text-typ så Studio alltid får rätt block-editor
 * (stilar, listor) – undviker buggar med anonym `of: [{ type: "block" }]`.
 */
export const portableArticleBodyType = defineType({
  name: "portableArticleBody",
  title: "Artikelbrödtext",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Brödtext", value: "normal" },
        { title: "Rubrik 2", value: "h2" },
        { title: "Rubrik 3", value: "h3" },
        { title: "Rubrik 4", value: "h4" },
      ],
      lists: [
        { title: "Punktlista", value: "bullet" },
        { title: "Numrerad", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Fet", value: "strong" },
          { title: "Kursiv", value: "em" },
        ],
        annotations: [],
      },
    }),
    defineArrayMember({
      type: "image",
      title: "Bild i texten",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt-text",
          description: "Kort beskrivning för skärmläsare och SEO.",
          validation: (rule) => rule.max(200),
        }),
        defineField({
          name: "caption",
          type: "string",
          title: "Bildtext",
          description: "Valfri text under bilden.",
          validation: (rule) => rule.max(300),
        }),
      ],
    }),
  ],
});
