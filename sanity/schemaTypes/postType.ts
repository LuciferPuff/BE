import { defineField, defineType } from "sanity";

export const postType = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Titel",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Publiceringsdatum",
      type: "datetime",
    }),
    defineField({
      name: "seoTitle",
      title: "SEO-titel",
      description: "Valfritt. Om tom används artikelns titel i Google.",
      type: "string",
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: "description",
      title: "Meta description",
      type: "string",
      description:
        "Kort sammanfattning för sökresultat och när länken delas. Ska vara under 160 tecken.",
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: "coverImage",
      title: "Huvudbild",
      type: "image",
      description: "Valfri bild som visas överst i artikeln och kan användas vid delning i sociala medier.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt-text",
          description: "Beskriv bilden kort – bra för SEO och skärmläsare.",
          validation: (rule) => rule.max(200),
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "Brödtext",
      type: "portableArticleBody",
      description:
        'Rubriker: klicka i stycket du vill ändra. Till vänster om texten finns en stilväljare (visar t.ex. "Brödtext") – klicka där och välj Rubrik 2/3/4. Fetstil (B) är inte samma sak som rubrik. Infoga bilder via +-menyn / "Bild i texten".',
    }),
  ],
});
