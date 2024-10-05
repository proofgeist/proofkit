import { type DataSource } from "~/utils/parseSettings.js";

interface Template {
  requireData: boolean;
  label: string;
  hint?: string;
  /** Path from the template/pages directory to the template files to copy. */
  templatePath: string;
  /** Will be run after the page contents is created and copied into the project. */
  postIntallFn?: (args: {
    pageDir: string;
    dataSource?: DataSource;
    schemaName?: string;
  }) => void | Promise<void>;
}
export const pageTemplates: Record<string, Template> = {
  blank: {
    requireData: false,
    label: "Blank",
    templatePath: "nextjs/blank",
  },
  table: {
    requireData: true,
    label: "Table",
    hint: "Use to load and show multiple records",
    templatePath: "nextjs/table",
  },
};
