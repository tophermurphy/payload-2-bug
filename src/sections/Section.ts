import type { Block } from "payload/types";


import Paragraph from "../blocks/Paragraph";
import Heading from "../blocks/Heading";

//? Maybe need to add Mutation Observer to Hide tab and not just content

const blocks: Block[] = [Heading, Paragraph ];

export const Section: Block = {
  slug: "section",
  fields: [
    {
      type: "row",
      admin: {
        className: "section-row-parent"
      },
      fields: [
        {
          name: "columns",
          type: "radio",
          options: ["1", "2"],
          defaultValue: "1",
        },
        {
          name: "layout",
          type: "select",
          admin: {
            condition: (_, sibling) => sibling.columns === "2",
            className: "section-layout-selector"
          },
          options: [
            { label: "50% / 50%", value: "6_6" },
            { label: "42% / 58%", value: "5_7" },
            { label: "58% / 42%", value: "7_5" },
            { label: "33% / 67%", value: "4_8" },
            { label: "67% / 33%", value: "8_4" },
            { label: "25% / 75%", value: "3_9" },
            { label: "75% / 25%", value: "9_3" },
          ],
          defaultValue: "6_6"
        },
      ],
    },
    {
      type: "tabs",
        admin: {
            className: "layout-tabs"
        },
      tabs: [
        {
          label: "Col 1",
          admin: {
            className: "layout-col-1"
          },
          fields: [
            {
              name: "column_1",
              label: "Column 1",
              type: "blocks",
              blocks: blocks,
            },
          ],
        },
        {
          label: "Col 2",
          admin: {
            className: "layout-col-2"
          },
          fields: [
            { 
              admin: {
                condition: (_, sibling) => sibling.columns === "2",
              },
              name: "column_2",
              label: "Column 2",
              type: "blocks",
              blocks: blocks,
            },
          ],
        },
      ],
    }
    
  ],
};

export default Section;
