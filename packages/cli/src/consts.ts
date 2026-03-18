import path from "node:path";
import { fileURLToPath } from "node:url";

import { getVersion } from "./utils/getProofKitVersion.js";

// Path is in relation to a single index.js file inside ./dist
const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);
export const PKG_ROOT = path.join(distPath, "../");
export const cliName = "proofkit";
export const npmName = "@proofkit/cli";
export const DOCS_URL = "https://proofkit.dev";

const version = getVersion();
const versionCharLength = version.length;
//export const PKG_ROOT = path.dirname(require.main.filename);

export const TITLE_TEXT = `
 _______                             ___  ___  ____    _   _   
|_   __ \\                          .' ..]|_  ||_  _|  (_) / |_ 
  | |__) |_ .--.   .--.    .--.   _| |_    | |_/ /    __ \`| |-'
  |  ___/[ \`/'\`\\]/ .'\`\\ \\/ .'\`\\ \\'-| |-'   |  __'.   [  | | |  
 _| |_    | |    | \\__. || \\__. |  | |    _| | \\  \\_  | | | |, 
|_____|  [___]    '.__.'  '.__.'  [___]  |____||____|[___]\\__/ 
${" ".repeat(61 - versionCharLength)}v${version}
`;
export const DEFAULT_APP_NAME = "my-proofkit-app";
export const CREATE_FM_APP = cliName;
export const AGENT_INSTRUCTIONS_BY_TEMPLATE = {
  "nextjs-mantine": [
    "Start with the ProofKit docs for implementation details and project conventions: https://proofkit.dev/docs",
    "Before doing any AI-assisted development in this project, run `npx @tanstack/intent@latest install` in the project root, then use the TanStack Intent docs as needed: https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers",
  ].join("\n"),
  "nextjs-shadcn": [
    "Start with the ProofKit docs for implementation details and project conventions: https://proofkit.dev/docs",
    "Before doing any AI-assisted development in this project, run `npx @tanstack/intent@latest install` in the project root, then use the TanStack Intent docs as needed: https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers",
  ].join("\n"),
  "vite-wv": [
    "Start with the ProofKit docs for implementation details and project conventions: https://proofkit.dev/docs/webviewer",
    "Before doing any AI-assisted development in this project, run `npx @tanstack/intent@latest install` in the project root, then use the TanStack Intent docs as needed: https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers",
  ].join("\n"),
} as const;

// Registry URL is injected at build time via tsdown define
declare const __REGISTRY_URL__: string;
// Provide a safe fallback when running from source (not built)
export const DEFAULT_REGISTRY_URL =
  // typeof check avoids ReferenceError if not defined at runtime
  typeof __REGISTRY_URL__ !== "undefined" && __REGISTRY_URL__ ? __REGISTRY_URL__ : "https://proofkit.dev";
