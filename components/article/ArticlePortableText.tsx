import {
  PortableText,
  type PortableTextComponents,
  type PortableTextProps,
} from "@portabletext/react";

import { urlForSanityImage } from "@/lib/sanity/imageUrl";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
  },
  types: {
    image: ({ value }) => {
      const src = urlForSanityImage(value, 1600);
      if (!src) return null;
      const alt =
        typeof value.alt === "string" && value.alt.trim() !== ""
          ? value.alt.trim()
          : "";
      const caption =
        typeof value.caption === "string" && value.caption.trim() !== ""
          ? value.caption.trim()
          : null;
      return (
        <figure className="article-body-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- varierande bildproportioner från Sanity */}
          <img
            src={src}
            alt={alt}
            className="article-body-inline-image"
            loading="lazy"
            decoding="async"
          />
          {caption != null && (
            <figcaption className="article-body-caption">{caption}</figcaption>
          )}
        </figure>
      );
    },
  },
};

export function ArticlePortableText(
  props: Pick<PortableTextProps, "value">,
) {
  return <PortableText value={props.value} components={components} />;
}
