import { CollectionConfig } from "payload/types";
import Slug from "../fields/Slug";

import Section from "../sections/Section";
import Columns from "../sections/Columns";


const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      label: "Title",
      type: "text",
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Sections",
          fields: [
            {
              name: "sections",
              type: "blocks",
              label: " ",
              minRows: 1,
              blocks: [Columns, Section],
            },
          ],
        },
      ],
    },
  ],
};

export default Pages;