import path from "path";
import { fileURLToPath } from "url";

// With the move to TSUP as a build tool, this keeps path routes in other files (installers, loaders, etc) in check more easily.
// Path is in relation to a single index.js file inside ./dist
const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);
export const PKG_ROOT = path.join(distPath, "../");
export const cliName = "proofkit";
export const npmName = "@proofgeist/kit";

//export const PKG_ROOT = path.dirname(require.main.filename);

export const TITLE_TEXT = `
 _______                             ___  ___  ____    _   _   
|_   __ \\                          .' ..]|_  ||_  _|  (_) / |_ 
  | |__) |_ .--.   .--.    .--.   _| |_    | |_/ /    __ \`| |-'
  |  ___/[ \`/'\`\\]/ .'\`\\ \\/ .'\`\\ \\'-| |-'   |  __'.   [  | | |  
 _| |_    | |    | \\__. || \\__. |  | |    _| | \\  \\_  | | | |, 
|_____|  [___]    '.__.'  '.__.'  [___]  |____||____|[___]\\__/ 
`;
export const DEFAULT_APP_NAME = "my-proofkit-app";
export const CREATE_FM_APP = cliName;
