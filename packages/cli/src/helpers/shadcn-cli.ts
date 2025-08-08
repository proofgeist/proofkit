import { DEFAULT_REGISTRY_URL } from "~/consts.js";
import { getSettings } from "~/utils/parseSettings.js";
import { runExecCommand } from "./installDependencies.js";

export async function shadcnInstall(components: string | string[]) {
  const componentsArray = Array.isArray(components) ? components : [components];
  const command = ["shadcn@latest", "add", ...componentsArray];
  await runExecCommand({
    command,
    loadingMessage: "Installing components...",
    successMessage: "Components installed successfully!",
  });
}

export function getRegistryUrl(): string {
  const url = getSettings().registryUrl ?? DEFAULT_REGISTRY_URL;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
