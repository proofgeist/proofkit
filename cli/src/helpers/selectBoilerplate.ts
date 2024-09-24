import path from "path";
import fs from "fs-extra";

import { PKG_ROOT } from "~/consts.js";
import { type InstallerOptions } from "~/installers/index.js";

type SelectBoilerplateProps = Required<
  Pick<InstallerOptions, "packages" | "projectDir">
>;
// This generates the _app.tsx file that is used to render the app
export const selectAppFile = ({ projectDir }: SelectBoilerplateProps) => {
  const appFileDir = path.join(PKG_ROOT, "template/extras/src/pages/_app");

  const appFile = "base.tsx";

  const appSrc = path.join(appFileDir, appFile);
  const appDest = path.join(projectDir, "src/pages/_app.tsx");
  fs.copySync(appSrc, appDest);
};

// Similar to _app, but for app router
export const selectLayoutFile = ({ projectDir }: SelectBoilerplateProps) => {
  const layoutFileDir = path.join(PKG_ROOT, "template/extras/src/app/layout");

  const layoutFile = "base.tsx";

  const appSrc = path.join(layoutFileDir, layoutFile);
  const appDest = path.join(projectDir, "src/app/layout.tsx");
  fs.copySync(appSrc, appDest);
};

// This selects the proper index.tsx to be used that showcases the chosen tech
export const selectIndexFile = ({ projectDir }: SelectBoilerplateProps) => {
  const indexFileDir = path.join(PKG_ROOT, "template/extras/src/pages/index");

  const indexFile = "base.tsx";
  const indexSrc = path.join(indexFileDir, indexFile);
  const indexDest = path.join(projectDir, "src/pages/index.tsx");
  fs.copySync(indexSrc, indexDest);
};

// Similar to index, but for app router
export const selectPageFile = ({ projectDir }: SelectBoilerplateProps) => {
  const indexFileDir = path.join(PKG_ROOT, "template/extras/src/app/page");

  const indexFile = "base.tsx";

  const indexSrc = path.join(indexFileDir, indexFile);
  const indexDest = path.join(projectDir, "src/app/page.tsx");
  fs.copySync(indexSrc, indexDest);
};
