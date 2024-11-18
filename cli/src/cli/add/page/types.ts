import { type appTypes, type DataSource } from "~/utils/parseSettings.js";

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
  supportedAppTypes: (typeof appTypes)[number][];
  /** Path from the template/pages directory to the template files to copy. */
  templatePath: string;
  /** Will be run after the page contents is created and copied into the project. */
  postIntallFn?: TPostInstallFn;
}
