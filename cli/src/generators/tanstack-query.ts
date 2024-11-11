import path from "path";
import fs from "fs-extra";
import { SyntaxKind, type Project } from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import {
  getSettings,
  setSettings,
  type Settings,
} from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";

export async function injectTanstackQuery({
  projectDir,
  ...args
}: {
  settings?: Settings;
  projectDir: string;
  project?: Project;
}) {
  const settings = args.settings ?? getSettings();
  if (settings.tanstackQuery) return;

  addPackageDependency({
    projectDir,
    dependencies: ["@tanstack/react-query"],
    devMode: false,
  });
  addPackageDependency({
    projectDir,
    dependencies: [
      "@tanstack/react-query-devtools",
      "@tanstack/eslint-plugin-query",
    ],
    devMode: true,
  });
  const extrasDir = path.join(PKG_ROOT, "template", "extras");

  fs.copySync(
    path.join(extrasDir, "config", "get-query-client.ts"),
    path.join(projectDir, "src/config/get-query-client.ts")
  );
  fs.copySync(
    path.join(extrasDir, "config", "query-provider.tsx"),
    path.join(projectDir, "src/config/query-provider.tsx")
  );

  // inject query provider into the root layout
  const project = args.project ?? getNewProject(projectDir);
  const rootLayout = project.addSourceFileAtPath(
    path.join(projectDir, "src/app/layout.tsx")
  );
  rootLayout.addImportDeclaration({
    moduleSpecifier: "@/config/query-provider",
    defaultImport: "QueryProvider",
  });

  const exportDefault = rootLayout.getFunction((dec) => dec.isDefaultExport());
  const bodyElement = exportDefault
    ?.getBody()
    ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement)
    ?.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .find(
      (openingElement) => openingElement.getTagNameNode().getText() === "body"
    )
    ?.getParentIfKind(SyntaxKind.JsxElement);

  const childrenText = bodyElement
    ?.getJsxChildren()
    .map((child) => child.getText())
    .filter(Boolean)
    .join("\n");

  bodyElement?.getChildSyntaxList()?.replaceWithText(
    `<QueryProvider>
      ${childrenText}
    </QueryProvider>`
  );

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }

  setSettings({ ...settings, tanstackQuery: true });
}
