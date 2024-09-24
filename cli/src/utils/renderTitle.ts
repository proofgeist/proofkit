import gradient from "gradient-string";

import { TITLE_TEXT } from "~/consts.js";
import { getUserPkgManager } from "~/utils/getUserPkgManager.js";

// colors brought in from vscode poimandres theme
const poimandresTheme = {
  blue: "#add7ff",
  cyan: "#89ddff",
  green: "#5de4c7",
  magenta: "#fae4fc",
  red: "#d0679d",
  yellow: "#fffac2",
};

const proofTheme = {
  purple: "#89216B",
  lightPurple: "#D15ABB",
  orange: "#FF595E",
};

export const proofGradient = gradient(Object.values(proofTheme));
export const renderTitle = () => {
  // resolves weird behavior where the ascii is offset
  const pkgManager = getUserPkgManager();
  if (pkgManager === "yarn" || pkgManager === "pnpm") {
    console.log("");
  }
  console.log(proofGradient.multiline(TITLE_TEXT));
};
