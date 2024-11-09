import path from "path";
import { type OttoAPIKey } from "@proofgeist/fmdapi";
import chalk from "chalk";
import dotenv from "dotenv";
import fs from "fs-extra";
import { type SourceFile } from "ts-morph";

import { getLayouts } from "~/cli/fmdapi.js";
import { PKG_ROOT } from "~/consts.js";
import { addConfig, runCodegenCommand } from "~/generators/fmdapi.js";
import { injectTanstackQuery } from "~/generators/tanstack-query.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { parseSettings } from "~/utils/parseSettings.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";
import { addToHeaderSlot } from "./auth-shared.js";

export const proofkitAuthInstaller = async ({
  projectDir,
}: {
  projectDir: string;
}) => {
  addPackageDependency({
    projectDir,
    dependencies: [
      "@node-rs/argon2",
      "@oslojs/binary",
      "@oslojs/crypto",
      "@oslojs/encoding",
    ],
    devMode: false,
  });

  // copy all files from template/extras/proofkit-auth to projectDir/src
  await fs.copy(
    path.join(PKG_ROOT, "template/extras/proofkit-auth"),
    path.join(projectDir, "src")
  );

  const project = getNewProject(projectDir);

  // ensure tanstack query is installed
  await injectTanstackQuery({ projectDir, project });

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

  await formatAndSaveSourceFiles(project);

  await checkForProofKitLayouts(projectDir);

  await runCodegenCommand({ projectDir });
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

async function checkForProofKitLayouts(projectDir: string) {
  const settings = parseSettings(projectDir);

  const dataSource = settings.dataSources
    .filter((s) => s.type === "fm")
    .find((s) => s.name === "filemaker");

  if (!dataSource) return;
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
        "Successfully detected all required layouts for ProofKit Auth in your FileMaker file."
      )
    );
    return;
  }

  // TODO install the addon
  // const spinner = await _runExecCommand({
  //   command: [
  //     `next-auth-adapter-filemaker@${dependencyVersionMap["next-auth-adapter-filemaker"]}`,
  //     "install-addon",
  //   ],
  //   projectDir,
  // });

  // // If the spinner was used to show the progress, use succeed method on it
  // // If not, use the succeed on a new spinner
  // (spinner ?? ora()).succeed(
  //   chalk.green("Successfully installed next-auth addon for FileMaker")
  // );

  console.log("");
  console.log(chalk.bgYellow(" ACTION REQUIRED: "));
  console.log(
    `${chalk.yellowBright(
      "You must install the ProofKit Auth addon in your FileMaker file."
    )}
Learn more: https://proofkit.proofgeist.com/auth/proofkit\n`
  );
}
