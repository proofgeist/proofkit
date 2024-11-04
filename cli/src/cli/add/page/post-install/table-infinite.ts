import { injectTanstackQuery } from "~/generators/tanstack-query.js";
import { type TPostInstallFn } from "../types.js";
import { postInstallTable } from "./table.js";

export const postInstallTableInfinite: TPostInstallFn = async (args) => {
  await postInstallTable(args);

  const { projectDir } = args;
  await injectTanstackQuery({ projectDir });
};
