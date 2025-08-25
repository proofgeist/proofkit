import fs from "fs";
import path from "path";

import { DEFAULT_REGISTRY_URL } from "~/consts.js";
import { state } from "~/state.js";
import { logger } from "~/utils/logger.js";
import { getSettings } from "~/utils/parseSettings.js";
import { runExecCommand } from "./installDependencies.js";
import { execa } from "execa";

export async function shadcnInstall(
  components: string | string[],
  friendlyComponentName?: string
) {
  const componentsArray = Array.isArray(components) ? components : [components];
  const command = ["shadcn@latest", "add", ...componentsArray, "--overwrite"];
  // Use execa to run the shadcn add command directly
  
  try {
    await execa("pnpm", ["dlx", ...command], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error(`Failed to run shadcn add: ${error}`);
    throw error;
  }
}

export function getRegistryUrl(): string {
  let url: string;
  try {
    url = getSettings().registryUrl ?? DEFAULT_REGISTRY_URL;
  } catch {
    // If we can't get settings (e.g., during development or outside a ProofKit project),
    // fall back to the default registry URL
    url = DEFAULT_REGISTRY_URL;
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export type ShadcnConfig = {
  style: "default" | "new-york";
  tailwind: {
    config: string;
    css: string;
    baseColor: string;
    cssVariables: boolean;
    prefix?: string;
    [k: string]: unknown;
  };
  rsc: boolean;
  tsx?: boolean;
  iconLibrary?: string;
  aliases: {
    utils: string;
    components: string;
    ui?: string;
    lib?: string;
    hooks?: string;
    [k: string]: unknown;
  };
  registries?: {
    [k: string]:
      | string
      | {
          url: string;
          params?: {
            [k: string]: string;
          };
          headers?: {
            [k: string]: string;
          };
          [k: string]: unknown;
        };
  };
  [k: string]: unknown;
};

export function getShadcnConfig() {
  const componentsJsonPath = path.join(state.projectDir, "components.json");
  const componentsJson = JSON.parse(
    fs.readFileSync(componentsJsonPath, "utf8")
  );
  return componentsJson as ShadcnConfig;
}
