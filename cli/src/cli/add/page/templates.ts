import { type DataSource } from "~/utils/parseSettings.js";
import { postInstallTable } from "./post-install/table.js";

export type TPostInstallFn = (args: {
  projectDir: string;
  /** Path in the project where the pages were copyied to. */
  pageDir: string;
  dataSource?: DataSource;
  schemaName?: string;
}) => void | Promise<void>;
export interface Template {
  requireData: boolean;
  label: string;
  hint?: string;
  /** Path from the template/pages directory to the template files to copy. */
  templatePath: string;
  /** Will be run after the page contents is created and copied into the project. */
  postIntallFn?: TPostInstallFn;
}
export const pageTemplates: Record<string, Template> = {
  blank: {
    requireData: false,
    label: "Blank",
    templatePath: "nextjs/blank",
  },
  table: {
    requireData: true,
    label: "Basic Table",
    hint: "Use to load and show multiple records",
    templatePath: "nextjs/table",
    postIntallFn: postInstallTable,
  },
};
