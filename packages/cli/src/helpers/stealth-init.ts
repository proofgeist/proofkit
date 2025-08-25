import fs from "fs-extra";

import { defaultSettings } from "~/utils/parseSettings.js";

/**
 * Used to add a proofkit.json file to an existing project
 */
export async function stealthInit() {
  // check if proofkit.json exists
  const proofkitJson = await fs.pathExists("proofkit.json");
  if (proofkitJson) {
    return;
  }

  // create proofkit.json
  await fs.writeJson("proofkit.json", defaultSettings);
}
