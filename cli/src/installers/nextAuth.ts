import path from "path";
import fs from "fs-extra";

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
