import path from "path";
import fs from "fs-extra";
import {
  JsxOpeningFragment,
  Project,
  SyntaxKind,
  type ReturnStatement,
  type SourceFile,
} from "ts-morph";

import { PKG_ROOT } from "~/consts.js";
import { runExecCommand } from "~/helpers/installDependencies.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { addToEnv } from "~/utils/addToEnvs.js";

export const nextAuthInstaller = async ({
  projectDir,
}: {
  projectDir: string;
}) => {
  addPackageDependency({
    projectDir,
    dependencies: ["next-auth", "bcrypt", "next-auth-adapter-filemaker"],
    devMode: false,
  });

  addPackageDependency({
    projectDir,
    dependencies: ["@types/bcrypt"],
    devMode: true,
  });

  const extrasDir = path.join(PKG_ROOT, "template/extras");

  const routeHandlerFile = "src/app/api/auth/[...nextauth]/route.ts";
  const srcToUse = routeHandlerFile;

  const apiHandlerSrc = path.join(extrasDir, srcToUse);
  const apiHandlerDest = path.join(projectDir, srcToUse);
  fs.copySync(apiHandlerSrc, apiHandlerDest);

  const authConfigSrc = path.join(
    extrasDir,
    "src/server",
    "next-auth",
    "base.ts"
  );
  const authConfigDest = path.join(projectDir, "src/server/auth.ts");
  fs.copySync(authConfigSrc, authConfigDest);

  const passwordSrc = path.join(
    extrasDir,
    "src/server",
    "next-auth",
    "password.ts"
  );
  const passwordDest = path.join(projectDir, "src/server/password.ts");
  fs.copySync(passwordSrc, passwordDest);

  // copy users.ts to data directory
  fs.copySync(
    path.join(extrasDir, "src/server/data/users.ts"),
    path.join(projectDir, "src/server/data/users.ts")
  );

  // copy auth pages
  fs.copySync(
    path.join(extrasDir, "src/app/auth"),
    path.join(projectDir, "src/app/auth")
  );

  // copy auth components
  fs.copySync(
    path.join(extrasDir, "src/components/next-auth"),
    path.join(projectDir, "src/components/next-auth")
  );

  const project = new Project({
    tsConfigFilePath: path.join(projectDir, "tsconfig.json"),
  });

  // modify root layout to wrap with session provider
  addNextAuthProviderToRootLayout(
    project.addSourceFileAtPath(path.join(projectDir, "src/app/layout.tsx"))
  );

  // inject signin/signout components to header slots
  addToHeaderSlot(
    project.addSourceFileAtPath(
      path.join(projectDir, "src/components/AppShell/slot-header-right.tsx")
    ),
    "@/components/next-auth/user-menu"
  );
  addToHeaderSlot(
    project.addSourceFileAtPath(
      path.join(
        projectDir,
        "src/components/AppShell/slot-header-mobile-content.tsx"
      )
    ),
    "@/components/next-auth/user-menu-mobile"
  );

  // add a protected safe-action-client

  // TODO do this part in-house, maybe with execa directly
  await runExecCommand({
    command: ["auth", "secret"],
    projectDir,
  });

  // add envs to .env and .env.schema
  addToEnv({
    projectDir,
    envs: [
      {
        name: "AUTH_SECRET",
        zodValue: "z.string().min(1)",
        type: "server",
        addToRuntimeEnv: false,
      },
    ],
  });
};

function addNextAuthProviderToRootLayout(rootLayoutSource: SourceFile) {
  // Add imports
  rootLayoutSource.addImportDeclaration({
    namedImports: [{ name: "NextAuthProvider" }],
    moduleSpecifier: "@/components/next-auth/next-auth-provider",
  });
  rootLayoutSource.addImportDeclaration({
    namedImports: [{ name: "auth" }],
    moduleSpecifier: "@/server/auth",
  });

  const exportDefault = rootLayoutSource.getFunction((dec) =>
    dec.isDefaultExport()
  );

  // make the function async
  exportDefault?.setIsAsync(true);

  // get the session server-side
  exportDefault
    ?.getFirstDescendantByKind(SyntaxKind.Block)
    ?.insertStatements(0, "const session = await auth();");

  // get the body element from the return statement
  const bodyElement = exportDefault
    ?.getBody()
    ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement)
    ?.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .find(
      (openingElement) => openingElement.getTagNameNode().getText() === "body"
    )
    ?.getParentIfKind(SyntaxKind.JsxElement);

  // wrap the body element with the next auth provider
  bodyElement?.replaceWithText(
    `<NextAuthProvider session={session}>
      ${bodyElement.getText()}
    </NextAuthProvider>`
  );

  rootLayoutSource.formatText();
  rootLayoutSource.saveSync();
}

function addToHeaderSlot(slotSourceFile: SourceFile, importFrom: string) {
  slotSourceFile.addImportDeclaration({
    defaultImport: "UserMenu",
    moduleSpecifier: importFrom,
  });

  // ensure Group from @mantine/core is imported
  const mantineCoreImport = slotSourceFile.getImportDeclaration(
    (dec) => dec.getModuleSpecifierValue() === "@mantine/core"
  );
  if (!mantineCoreImport) {
    slotSourceFile.addImportDeclaration({
      namedImports: [{ name: "Group" }],
      moduleSpecifier: "@mantine/core",
    });
  } else {
    const groupImport = mantineCoreImport
      .getNamedImports()
      .find((imp) => imp.getName() === "Group");

    if (!groupImport) {
      mantineCoreImport.addNamedImport({ name: "Group" });
    }
  }

  const returnStatement = ensureReturnStatementIsWrappedInFragment(
    slotSourceFile
      .getFunction((dec) => dec.isDefaultExport())
      ?.getBody()
      ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement)
  );

  const existingElements = returnStatement
    ?.getFirstDescendantByKind(SyntaxKind.JsxOpeningFragment)
    ?.getParentIfKind(SyntaxKind.JsxFragment)
    ?.getFirstDescendantByKind(SyntaxKind.SyntaxList)
    ?.getText();

  if (!existingElements) {
    console.log(
      `Failed to inject into header slot at ${slotSourceFile.getFilePath()}`
    );
    return;
  }

  returnStatement?.replaceWithText(
    `return (<><Group>${existingElements}<UserMenu /></Group></>)`
  );
  returnStatement?.formatText();
  slotSourceFile.saveSync();
}

// TODO move to utils
function ensureReturnStatementIsWrappedInFragment(
  returnStatement: ReturnStatement | undefined
) {
  const expression =
    returnStatement
      ?.getExpressionIfKind(SyntaxKind.ParenthesizedExpression)
      ?.getExpression() ?? returnStatement?.getExpression();

  if (expression?.isKind(SyntaxKind.JsxFragment)) {
    return returnStatement;
  }

  returnStatement?.replaceWithText(`return <>${expression}</>;`);
  return returnStatement;
}
