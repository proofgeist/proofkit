import path from "path";
import fs from "fs-extra";

import { type Installer } from "~/installers/index.js";

export type FMAuthKeys =
  | { username: string; password: string }
  | { ottoApiKey: string };

export const envVariablesInstaller: Installer = ({
  projectDir,
  dataApiKey,
  fileName,
  fmServerURL,
}) => {
  const envContent = getEnvContent({
    fileName,
    fmServerURL,
    dataApiKey,
  });

  // const envFile = "base.ts";

  // const envSchemaSrc = path.join(PKG_ROOT, "template/extras/src/env", envFile);
  // const envSchemaDest = path.join(projectDir, "src/env.ts");
  // fs.copyFileSync(envSchemaSrc, envSchemaDest);

  const envDest = path.join(projectDir, ".env");

  fs.writeFileSync(envDest, envContent, "utf-8");
};

const getEnvContent = ({
  fileName,
  dataApiKey,
  fmServerURL,
}: {
  fileName: string;
  dataApiKey: string;
  fmServerURL: string;
}) => {
  const content = `
# When adding additional environment variables, the schema in "/src/env.ts"
# should be updated accordingly.

FM_DATABASE=${fileName}
FM_SERVER=${fmServerURL}
OTTO_API_KEY=${dataApiKey}
`
    .trim()
    .concat("\n");

  //   if (authType === "nextAuth")
  //     content += `

  //   # Next Auth
  // # You can generate a new secret on the command line with:
  // # openssl rand -base64 32
  // # https://next-auth.js.org/configuration/options#secret
  // # NEXTAUTH_SECRET=""
  // NEXTAUTH_URL="http://localhost:3000"

  // # Next Auth Discord Provider
  // DISCORD_CLIENT_ID=""
  // DISCORD_CLIENT_SECRET=""
  // `;

  return content;
};
