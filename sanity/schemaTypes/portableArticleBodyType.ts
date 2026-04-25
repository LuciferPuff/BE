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
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Länk",
            fields: [
              defineField({
                name: "href",
                type: "string",
                title: "URL eller sökväg",
                description:
                  "Extern länk med https://, eller intern sökväg som börjar med / (t.ex. /artiklar/slug).",
                validation: (rule) =>
                  rule.required().custom((val) => {
                    const v = typeof val === "string" ? val.trim() : "";
                    if (!v) return "Ange en adress";
                    if (/^https?:\/\//i.test(v)) return true;
                    if (/^mailto:/i.test(v)) return true;
                    if (/^tel:/i.test(v)) return true;
                    if (v.startsWith("/") && !v.startsWith("//")) return true;
                    if (v.startsWith("#")) return true;
                    return "Använd https://… eller en intern sökväg som börjar med /";
                  }),
              }),
              defineField({
                name: "openInNewTab",
                type: "boolean",
                title: "Öppna i ny flik",
                description: "Lämpligt för externa länkar. Ignoreras för interna sökvägar.",
                initialValue: true,
              }),
            ],
          },
        ],
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
