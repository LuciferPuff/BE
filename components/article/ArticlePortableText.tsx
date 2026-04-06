import {
  PortableText,
  type PortableTextComponents,
  type PortableTextProps,
} from "@portabletext/react";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
  },
};

export function ArticlePortableText(
  props: Pick<PortableTextProps, "value">,
) {
  return <PortableText value={props.value} components={components} />;
}
