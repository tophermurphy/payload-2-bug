import { Block } from "payload/types";

import Paragraph from "../blocks/Paragraph";
import Heading from "../blocks/Heading";

export const Columns: Block = {
  slug: "columns",
  fields: [
    {
      name: "content",
      type: "blocks",
      blocks: [Paragraph, Heading],
    },

  ],
};

export default Columns;