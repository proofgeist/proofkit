import path from "path";
import fs from "fs-extra";
import { SyntaxKind, type Project } from "ts-morph";

import { formatAndSaveSourceFiles, getNewProject } from "./ts-morph.js";

interface EnvSchema {
  name: string;
  zodValue: string;
  /** This value will be added to the .env file, unless `addToRuntimeEnv` is set to `false`. */
  defaultValue?: string;
  type: "server" | "client";
  addToRuntimeEnv?: boolean;
}

export async function addToEnv({
  projectDir,
  envs,
  envFileDescription,
  ...args
}: {
  projectDir: string;
  project?: Project;
  envs: EnvSchema[];
  envFileDescription?: string;
}) {
  const envSchemaFile = path.join(projectDir, "src/config/env.ts");

  const project = args.project ?? getNewProject(projectDir);
  const schemaFile = project.addSourceFileAtPath(envSchemaFile);

  if (!schemaFile) throw new Error("Schema file not found");

  // Find the createEnv call expression
  const createEnvCall = schemaFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((callExpr) => callExpr.getExpression().getText() === "createEnv");

  // Get the server object property
  const opts = createEnvCall?.getArguments()[0];

  const serverProperty = opts
    ?.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((prop) => prop.getName() === "server")
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

  const clientProperty = opts
    ?.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((prop) => prop.getName() === "client")
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

  const runtimeEnvProperty = opts
    ?.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((prop) => prop.getName() === "experimental__runtimeEnv")
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);

  const serverEnvs = envs.filter((env) => env.type === "server");
  const clientEnvs = envs.filter((env) => env.type === "client");

  for (const env of serverEnvs) {
    serverProperty?.addPropertyAssignment({
      name: env.name,
      initializer: env.zodValue,
    });
  }

  for (const env of clientEnvs) {
    clientProperty?.addPropertyAssignment({
      name: env.name,
      initializer: env.zodValue,
    });

    runtimeEnvProperty?.addPropertyAssignment({
      name: env.name,
      initializer: `process.env.${env.name}`,
    });
  }

  const envsString = envs
    .filter((env) => env.addToRuntimeEnv ?? true)
    .map((env) => `${env.name}=${env.defaultValue ?? ""}`)
    .join("\n");

  const dotEnvFile = path.join(projectDir, ".env");
  const currentFile = fs.readFileSync(dotEnvFile, "utf-8");
  fs.writeFileSync(
    dotEnvFile,
    `${currentFile}
${envFileDescription ? `# ${envFileDescription}\n${envsString}` : envsString}
    `
  );

  if (!args.project) {
    await formatAndSaveSourceFiles(project);
  }

  return schemaFile;
}
