import path from "path";
import chalk from "chalk";
import fs from "fs-extra";
import { Project, SyntaxKind } from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { addToEnv } from "~/utils/addToEnvs.js";

export const clerkInstaller = ({ projectDir }: { projectDir: string }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["@clerk/nextjs"],
    devMode: false,
  });

  // add clerk middleware
  // check if middleware already exists, if not add it
  const extrasDir = path.join(PKG_ROOT, "template/extras");

  const middlewareDest = path.join(projectDir, "src/middleware.ts");
  if (!fs.existsSync(middlewareDest)) {
    const middlewareSrc = path.join(extrasDir, "src/middleware/clerk.ts");
    fs.copySync(middlewareSrc, middlewareDest);
  } else {
    // throw new Error("Middleware already exists");
    console.log(
      chalk.yellow(
        "Middleware already exists. To require auth for your app, be sure to follow the guide to setup Clerk middleware. https://clerk.com/docs/references/nextjs/clerk-middleware#clerk-middleware-next-js"
      )
    );
  }

  // add ClerkProvider to app layout
  const layoutFile = path.join(projectDir, "src/app/layout.tsx");
  addClerkProvider(layoutFile);

  // add envs to .env and .env.schema
  addToEnv({
    projectDir,
    envs: [
      {
        name: "CLERK_SECRET_KEY",
        zodValue: "z.string().startsWith('sk_')",
        type: "server",
      },
      {
        name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        zodValue: "z.string().startsWith('pk_')",
        type: "client",
      },
    ],
    envFileDescription:
      "Clerk. Set up a new app at https://clerk.com to get these values.",
  });

  // maybe add Clerk login/out button to header?
};

export function addClerkProvider(srcFile: string) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(srcFile);

  // Step 1: Add ClerkProvider import if not already present
  const hasClerkImport = sourceFile.getImportDeclaration("@clerk/nextjs");
  if (!hasClerkImport) {
    sourceFile.addImportDeclaration({
      namedImports: [{ name: "ClerkProvider" }],
      moduleSpecifier: "@clerk/nextjs",
    });
  }

  // Step 2: Wrap default exported function's return statement with ClerkProvider
  const exportDefault = sourceFile.getFunction((dec) => dec.isDefaultExport());

  if (exportDefault) {
    // get the return statement
    const returnStatement = exportDefault
      ?.getBody()
      ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement);

    if (returnStatement) {
      // get the return statement's JSX element
      const returnExpression =
        returnStatement
          .getFirstDescendantByKind(SyntaxKind.ParenthesizedExpression)
          ?.getExpression() ??
        returnStatement.getFirstDescendantByKind(SyntaxKind.JsxElement);

      const returnElementText = returnExpression?.getText() ?? "";
      returnStatement.replaceWithText((writer) => {
        writer.write("return (");
        writer.writeLine("<ClerkProvider>");
        writer.writeLine(returnElementText);
        writer.writeLine("</ClerkProvider>");
        writer.write(");");
      });
    }
  }
  sourceFile.saveSync();
}
