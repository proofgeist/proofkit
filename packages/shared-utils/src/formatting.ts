import { Project } from "ts-morph";
import { format, getFileInfo } from "prettier";

/**
 * Formats all source files in a ts-morph Project using prettier and saves the changes.
 * @param project The ts-morph Project containing the files to format
 */
export async function formatAndSaveSourceFiles(project: Project) {
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
  await project.save();
}
