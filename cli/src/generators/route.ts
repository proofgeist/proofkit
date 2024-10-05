import path from "path";
import { type RouteLink } from "index.js";
import { SyntaxKind } from "ts-morph";

import { getNewProject } from "~/utils/ts-morph.js";

export function addRouteToNav({
  projectDir,
  navType,
  ...route
}: Omit<RouteLink, "type"> & {
  projectDir: string;
  navType: "primary" | "secondary";
}) {
  const project = getNewProject(projectDir);
  const sourceFile = project.addSourceFileAtPath(
    path.join(projectDir, "src/app/navigation.tsx")
  );
  sourceFile
    .getVariableDeclaration(
      navType === "primary" ? "primaryRoutes" : "secondaryRoutes"
    )
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression)
    ?.addElement((writer) =>
      writer
        .block(() => {
          writer.write(`
          label: "${route.label}",
          type: "link",
          href: "${route.href}",`);
        })
        .write(",")
    );
}
