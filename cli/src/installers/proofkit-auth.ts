import path from "path";
import { type OttoAPIKey } from "@proofgeist/fmdapi";
import chalk from "chalk";
import dotenv from "dotenv";
import fs from "fs-extra";
import { SyntaxKind, type SourceFile } from "ts-morph";

import { getLayouts } from "~/cli/fmdapi.js";
import { PKG_ROOT } from "~/consts.js";
import { addConfig, runCodegenCommand } from "~/generators/fmdapi.js";
import { injectTanstackQuery } from "~/generators/tanstack-query.js";
import { installDependencies } from "~/helpers/installDependencies.js";
import { state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { getSettings } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";
import { addToHeaderSlot } from "./auth-shared.js";
import { installFmAddon } from "./install-fm-addon.js";
import { installReactEmail } from "./react-email.js";

export const proofkitAuthInstaller = async () => {
  const projectDir = state.projectDir;
  addPackageDependency({
    projectDir,
    dependencies: [
      "@node-rs/argon2",
      "@oslojs/binary",
      "@oslojs/crypto",
      "@oslojs/encoding",
      "js-cookie",
    ],
    devMode: false,
  });

  addPackageDependency({
    projectDir,
    dependencies: ["@types/js-cookie"],
    devMode: true,
  });

  // copy all files from template/extras/fmaddon-auth to projectDir/src
  await fs.copy(
    path.join(PKG_ROOT, "template/extras/fmaddon-auth"),
    path.join(projectDir, "src")
  );

  const project = getNewProject(projectDir);

  // ensure tanstack query is installed
  await injectTanstackQuery({ project });

  // inject signin/signout components to header slots
  addToHeaderSlot(
    project.addSourceFileAtPath(
      path.join(projectDir, "src/components/AppShell/slot-header-right.tsx")
    ),
    "@/components/auth/user-menu"
  );
  // addToHeaderSlot(
  //   project.addSourceFileAtPath(
  //     path.join(
  //       projectDir,
  //       "src/components/AppShell/slot-header-mobile-content.tsx"
  //     )
  //   ),
  //   "@/components/clerk-auth/user-menu-mobile"
  // );

  addToSafeActionClient(
    project.addSourceFileAtPathIfExists(
      path.join(projectDir, "src/server/safe-action.ts")
    )
  );

  await addConfig({
    project,
    config: {
      clientSuffix: "Layout",
      schemas: [
        {
          layout: "proofkit_auth_sessions",
          schemaName: "sessions",
          strictNumbers: true,
        },
        {
          layout: "proofkit_auth_users",
          schemaName: "users",
          strictNumbers: true,
        },
        {
          layout: "proofkit_auth_email_verification",
          schemaName: "emailVerification",
          strictNumbers: true,
        },
        {
          layout: "proofkit_auth_password_reset",
          schemaName: "passwordReset",
          strictNumbers: true,
        },
      ],
      clearOldFiles: true,
      useZod: false,
      path: "./src/server/auth/db",
    },
    projectDir,
    runCodegen: false,
  });
  await installReactEmail({ project });

  protectMainLayout(
    project.addSourceFileAtPath(
      path.join(projectDir, "src/app/(main)/layout.tsx")
    )
  );

  await formatAndSaveSourceFiles(project);

  const hasProofKitLayouts = await checkForProofKitLayouts(projectDir);
  if (hasProofKitLayouts) {
    await runCodegenCommand({ projectDir });
  }

  await installDependencies({ projectDir });
};

function addToSafeActionClient(sourceFile?: SourceFile) {
  if (!sourceFile) {
    console.log(
      chalk.yellow(
        "Failed to inject into safe-action-client. Did you move the safe-action.ts file?"
      )
    );
    return;
  }

  sourceFile.addImportDeclaration({
    namedImports: [{ name: "getCurrentSession" }],
    moduleSpecifier: "./auth/utils/session",
  });

  // add to end of file
  sourceFile.addStatements((writer) =>
    writer.writeLine(`export const authedActionClient = actionClient.use(async ({ next, ctx }) => {
  const { session, user } = await getCurrentSession();
  if (session === null) {
    throw new Error("Unauthorized");
  }

  return next({ ctx: { ...ctx, session, user } });
});
`)
  );
}

function protectMainLayout(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    defaultImport: "Protect",
    moduleSpecifier: "@/components/auth/protect",
  });

  // inject query provider into the root layout

  const exportDefault = sourceFile.getFunction((dec) => dec.isDefaultExport());
  const bodyElement = exportDefault
    ?.getBody()
    ?.getFirstDescendantByKind(SyntaxKind.ReturnStatement)
    ?.getFirstDescendantByKind(SyntaxKind.JsxElement);

  bodyElement?.replaceWithText(
    `<Protect>
      ${bodyElement?.getText()}
    </Protect>`
  );
}

async function checkForProofKitLayouts(projectDir: string): Promise<boolean> {
  const settings = getSettings();

  const dataSource = settings.dataSources
    .filter((s) => s.type === "fm")
    .find((s) => s.name === "filemaker");

  if (!dataSource) return false;
  if (settings.envFile) {
    dotenv.config({
      path: path.join(projectDir, settings.envFile),
    });
  }
  const dataApiKey = process.env[dataSource.envNames.apiKey]! as OttoAPIKey;
  const fmFile = process.env[dataSource.envNames.database]!;
  const server = process.env[dataSource.envNames.server]!;

  const existingLayouts = await getLayouts({
    dataApiKey,
    fmFile,
    server,
  });
  const proofkitAuthLayouts = [
    "proofkit_auth_sessions",
    "proofkit_auth_users",
    "proofkit_auth_email_verification",
    "proofkit_auth_password_reset",
  ];

  const allProofkitAuthLayoutsExist = proofkitAuthLayouts.every((layout) =>
    existingLayouts.some((l) => l === layout)
  );

  if (allProofkitAuthLayoutsExist) {
    console.log(
      chalk.green(
        "Successfully detected all required layouts for FM Add-on Auth in your FileMaker file."
      )
    );
    return true;
  }

  await installFmAddon({ addonName: "auth" });

  return false;
}
