import pathModule from "node:path";

import { removeTrailingSlash } from "./removeTrailingSlash.js";

const whitespaceRegex = /\s+/g;

/**
 * Parses the appName and its path from the user input.
 *
 * Returns a tuple of of `[appName, path]`, where `appName` is the name put in the "package.json"
 * file and `path` is the path to the directory where the app will be created.
 *
 * If `appName` is ".", the name of the directory will be used instead. Handles the case where the
 * input includes a scoped package name in which case that is being parsed as the name, but not
 * included as the path.
 *
 * For example:
 *
 * - dir/@mono/app => ["@mono/app", "dir/app"]
 * - dir/app => ["app", "dir/app"]
 */
export const parseNameAndPath = (rawInput: string) => {
  const input = removeTrailingSlash(rawInput);
  const paths = input.split("/");
  const normalizedPaths = [...paths];
  const lastPathIndex = normalizedPaths.length - 1;

  let appName = (normalizedPaths.at(-1) ?? "").replace(whitespaceRegex, "-").toLowerCase();
  normalizedPaths[lastPathIndex] = appName;

  // If the user ran `npx proofkit .` or similar, the appName should be the current directory
  if (appName === ".") {
    const parsedCwd = pathModule.resolve(process.cwd());
    appName = pathModule.basename(parsedCwd).replace(whitespaceRegex, "-").toLowerCase();
  }

  // If the first part is a @, it's a scoped package
  const indexOfDelimiter = normalizedPaths.findIndex((p) => p.startsWith("@"));
  if (indexOfDelimiter !== -1) {
    appName = normalizedPaths.slice(indexOfDelimiter).join("/");
  }

  const path = normalizedPaths.filter((p) => !p.startsWith("@")).join("/");

  return [appName, path] as const;
};
