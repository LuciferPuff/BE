import { type SchemaTypeDefinition } from "sanity";

import { portableArticleBodyType } from "./portableArticleBodyType";
import { postType } from "./postType";

export const schemaTypes: SchemaTypeDefinition[] = [
  portableArticleBodyType,
  postType,
];
