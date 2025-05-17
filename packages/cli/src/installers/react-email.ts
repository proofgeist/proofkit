import path from "path";
import * as p from "@clack/prompts";
import chalk from "chalk";
import fs from "fs-extra";
import { type Project } from "ts-morph";
import { type PackageJson } from "type-fest";

import { abortIfCancel } from "~/cli/utils.js";
import { PKG_ROOT } from "~/consts.js";
import { state } from "~/state.js";
import { addPackageDependency } from "~/utils/addPackageDependency.js";
import { addToEnv } from "~/utils/addToEnvs.js";
import { logger } from "~/utils/logger.js";
import { formatAndSaveSourceFiles, getNewProject } from "~/utils/ts-morph.js";

export async function installEmailProvider({ ...args }: { project?: Project }) {
  const projectDir = state.projectDir;
  addPackageDependency({
    dependencies: ["@react-email/components", "@react-email/render"],
    devMode: false,
    projectDir,
  });
  addPackageDependency({
    dependencies: ["react-email"],
    devMode: true,
    projectDir,
  });

  // add a script to package.json
  const pkgJson = fs.readJSONSync(
    path.join(projectDir, "package.json")
  ) as PackageJson;
  pkgJson.scripts!["email:preview"] = "email dev --port 3010 --dir=src/emails";
  fs.writeJSONSync(path.join(projectDir, "package.json"), pkgJson, {
    spaces: 2,
  });

  const project = args.project ?? getNewProject(projectDir);

  const emailProvider = state.emailProvider;

  if (emailProvider === "plunk") {
    await installPlunk({ project });
  } else if (emailProvider === "resend") {
    await installResend({ project });
  } else {
    await fs.copy(
      path.join(PKG_ROOT, "template/extras/emailProviders/none/email.tsx"),
      path.join(projectDir, "src/server/auth/email.tsx")
    );
  }

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }
}

export async function installPlunk({ project }: { project?: Project }) {
  const projectDir = state.projectDir;
  addPackageDependency({
    dependencies: ["@plunk/node"],
    devMode: false,
    projectDir,
  });

  const apiKey =
    typeof state.apiKey === "string"
      ? state.apiKey
      : state.ci
        ? ""
        : abortIfCancel(
            await p.text({
              message: `Enter your Plunk API key\n${chalk.dim(
                `Enter your Secret API Key from https://app.useplunk.com/settings/api`
              )}`,
              placeholder: "...or leave blank to do this later",
            })
          );

  if (!apiKey) {
    logger.warn(
      "You will need to add your Plunk API key to the .env file manually for your app to run."
    );
  }

  console.log("");

  await addToEnv({
    projectDir,
    project,
    envs: [
      {
        name: "PLUNK_API_KEY",
        zodValue: `z.string().startsWith("sk_")`,
        type: "server",
        defaultValue: apiKey,
      },
    ],
  });

  await fs.copy(
    path.join(PKG_ROOT, "template/extras/emailProviders/plunk/service.ts"),
    path.join(projectDir, "src/server/services/plunk.ts")
  );

  await fs.copy(
    path.join(PKG_ROOT, "template/extras/emailProviders/plunk/email.tsx"),
    path.join(projectDir, "src/server/auth/email.tsx")
  );
}

export async function installResend({ project }: { project?: Project }) {
  const projectDir = state.projectDir;
  addPackageDependency({
    dependencies: ["resend"],
    devMode: false,
    projectDir,
  });

  const apiKey =
    typeof state.apiKey === "string"
      ? state.apiKey
      : state.ci
        ? ""
        : abortIfCancel(
            await p.text({
              message: `Enter your Resend API key\n${chalk.dim(
                `Only "Sending Access" permission required: https://resend.com/api-keys`
              )}`,
              placeholder: "...or leave blank to do this later",
            })
          );

  if (!apiKey) {
    logger.warn(
      "You will need to add your Resend API key to the .env file manually for your app to run."
    );
  }

  console.log("");

  await addToEnv({
    projectDir,
    project,
    envs: [
      {
        name: "RESEND_API_KEY",
        zodValue: `z.string().startsWith("re_")`,
        type: "server",
        defaultValue: apiKey,
      },
    ],
  });

  await fs.copy(
    path.join(PKG_ROOT, "template/extras/emailProviders/resend/service.ts"),
    path.join(projectDir, "src/server/services/resend.ts")
  );

  await fs.copy(
    path.join(PKG_ROOT, "template/extras/emailProviders/resend/email.tsx"),
    path.join(projectDir, "src/server/auth/email.tsx")
  );
}
