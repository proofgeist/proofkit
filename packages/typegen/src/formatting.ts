import { format } from "prettier";
import type { Project } from "ts-morph";

/**
 * Formats all source files in a ts-morph Project using prettier and saves the changes.
 * @param project The ts-morph Project containing the files to format
 */
export async function formatAndSaveSourceFiles(project: Project) {
  try {
    const files = project.getSourceFiles();

    // run each file through the prettier formatter
    for await (const file of files) {
      const filePath = file.getFilePath();

      const formatted = await format(file.getFullText(), {
        filepath: filePath,
      });
      file.replaceWithText(formatted);
    }
  } catch (_error) {
    // Ignore formatting errors and continue
  }
  await project.save();
}
