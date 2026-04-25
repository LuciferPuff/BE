import {
  PortableText,
  type PortableTextComponents,
  type PortableTextProps,
} from "@portabletext/react";
import type { ReactNode } from "react";
import Link from "next/link";

import { urlForSanityImage } from "@/lib/sanity/imageUrl";

type LinkMarkValue = {
  href?: string;
  openInNewTab?: boolean;
};

function ArticleBodyLink({
  value,
  children,
}: {
  value?: LinkMarkValue;
  children: ReactNode;
}) {
  const href = typeof value?.href === "string" ? value.href.trim() : "";
  if (href === "") return <>{children}</>;

  const isInternal = href.startsWith("/") && !href.startsWith("//");
  const openInNewTab =
    value?.openInNewTab !== false && !isInternal && !href.startsWith("#");

  if (isInternal) {
    return <Link href={href}>{children}</Link>;
  }

  return (
    <a
      href={href}
      {...(openInNewTab
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

const components: PortableTextComponents = {
  marks: {
    link: ArticleBodyLink,
  },
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
