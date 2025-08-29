import { format, getFileInfo } from "prettier";
import { Project } from "ts-morph";

import { state } from "~/state.js";

/**
 * Formats all source files in a ts-morph Project using prettier and saves the changes.
 * @param project The ts-morph Project containing the files to format
 */
export async function formatAndSaveSourceFiles(project: Project) {
  project.saveSync(); // save here in case formatting fails
  try {
    const files = project.getSourceFiles();
    // run each file through the prettier formatter
    for await (const file of files) {
      const filePath = file.getFilePath();
      const fileInfo = await getFileInfo(filePath);

      if (fileInfo.ignored) continue;

      const formatted = await format(file.getFullText(), {
        filepath: filePath,
      });
      file.replaceWithText(formatted);
    }
  } catch (error) {
    if (state.debug) {
      console.log("Error formatting files");
      console.error(error);
    }
  } finally {
    await project.save();
  }
}
