import { replaceTextInFiles } from "./replaceText.js";

export const setImportAlias = (projectDir: string, importAlias: string) => {
  const normalizedImportAlias = importAlias
    .replace(/\*/g, "") // remove any wildcards (~/* -> ~/)
    .replace(/[^\/]$/, "$&/"); // ensure trailing slash (@ -> ~/)

  // update import alias in any files if not using the default
  replaceTextInFiles(projectDir, `~/`, normalizedImportAlias);
};
