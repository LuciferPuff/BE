import { defineField, defineType } from "sanity";

export const guideType = defineType({
  name: "guide",
  title: "Guide",
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
      description: "Valfritt. Om tom används guidens titel i Google.",
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
      description:
        "Valfri bild överst i guiden och vid delning i sociala medier.",
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
      title: "Innehåll",
      type: "portableArticleBody",
      description:
        'Samma editor som artiklar – rubriker via stilmenyn till vänster om stycket (Rubrik 2/3/4). Bilder i texten via +-menyn.',
    }),
  ],
});
