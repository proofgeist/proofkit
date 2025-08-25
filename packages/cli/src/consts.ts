import path from "path";
import { fileURLToPath } from "url";

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

// Registry URL is injected at build time via tsdown define
declare const __REGISTRY_URL__: string;
export const DEFAULT_REGISTRY_URL = __REGISTRY_URL__;
