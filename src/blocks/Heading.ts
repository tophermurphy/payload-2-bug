import { Block } from "payload/types";

export const Heading: Block = {
  slug: "heading",
  fields: [
    {
      name: "size",
      type: "radio",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
      defaultValue: "h2",
    },
    {
      name: "heading",
      type: "text",
    },
  ],
};

export default Heading;
