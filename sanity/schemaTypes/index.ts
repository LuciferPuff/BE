import { type SchemaTypeDefinition } from "sanity";

import { guideType } from "./guideType";
import { portableArticleBodyType } from "./portableArticleBodyType";
import { postType } from "./postType";

export const schemaTypes: SchemaTypeDefinition[] = [
  portableArticleBodyType,
  postType,
  guideType,
];
