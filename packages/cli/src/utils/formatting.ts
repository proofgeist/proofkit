import { execa } from "execa";
import type { Project } from "ts-morph";

import { state } from "~/state.js";

/**
 * Formats all source files in a ts-morph Project using ultracite and saves the changes.
 * @param project The ts-morph Project containing the files to format
 */
export async function formatAndSaveSourceFiles(project: Project) {
  await project.save(); // save files first
  try {
    // Run ultracite fix on the project directory
    await execa("npx", ["ultracite", "fix", "."], {
      cwd: state.projectDir,
    });
  } catch (error) {
    if (state.debug) {
      console.log("Error formatting files with ultracite");
      console.error(error);
    }
    // Continue even if formatting fails
  }
}
