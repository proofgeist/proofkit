import path from "path";
import fs from "fs-extra";
import { type PackageJson } from "type-fest";

import { PKG_ROOT } from "~/consts.js";

export const getVersion = () => {
  const packageJsonPath = path.join(PKG_ROOT, "package.json");

  const packageJsonContent = fs.readJSONSync(packageJsonPath) as PackageJson;

  return packageJsonContent.version ?? "1.0.0";
};

export const getNodeMajorVersion = () => {
  const defaultVersion = "22";
  try {
    return process.versions.node.split(".")[0] ?? defaultVersion;
  } catch {
    return defaultVersion;
  }
};
