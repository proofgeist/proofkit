import { TemplateMetadata } from "@/lib/types";

export const meta: TemplateMetadata = {
  title: "Basic Table",
  description: "A basic table with data fetched from the database",
  category: "page",
  registryType: "registry:page",
  dependencies: [],
  registryDependencies: ["{proofkit}/r/utils/nuqs","https://reui.io/r/data-grid.json","https://reui.io/r/scroll-area.json"],
  schemaRequired: true,
  files: [
    {
      sourceFileName: "page.tsx",
      destinationPath: "src/app/__PATH__/page.tsx",
      type: "registry:page",
      handlebars: true,
    },
    {
      sourceFileName: "table.tsx",
      destinationPath: "src/app/__PATH__/table.tsx",
      type: "registry:page",
      handlebars: true,
    },
    {
      sourceFileName: "constants.ts",
      destinationPath: "src/app/__PATH__/constants.ts",
      type: "registry:page",
    },
    {
      sourceFileName: "README.md",
      destinationPath: "src/app/__PATH__/README.md",
      type: "registry:page",
      handlebars: true,
    },
  ],
};
