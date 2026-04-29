import { type SchemaTypeDefinition } from "sanity";

import { guideType } from "./guideType";
import { portableArticleBodyType } from "./portableArticleBodyType";
import { postType } from "./postType";
import { tableRowType } from "./tableRowType";
import { tableType } from "./tableType";

export const schemaTypes: SchemaTypeDefinition[] = [
  tableRowType,
  tableType,
  portableArticleBodyType,
  postType,
  guideType,
];
